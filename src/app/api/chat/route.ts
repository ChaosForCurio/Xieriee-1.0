import { NextResponse } from 'next/server';
import { getGeminiResponse } from '@/lib/gemini';
import { stackServerApp } from '@/stack';
import { getMemories, saveMemory, forgetMemory, formatMemoriesForContext } from '@/lib/memory';
import { saveMessage, getChatHistory, saveSummary, getSummary, isRateLimited, ensureChat } from '@/lib/db-actions';
import { Content } from "@google/generative-ai";

export async function POST(request: Request) {
    try {
        const user = await stackServerApp.getUser();
        const userId = user?.id || 'anonymous'; // Fallback for now, but ideally require auth

        const { prompt, image, messages, chatId: providedChatId } = await request.json();
        const chatId = providedChatId || 'default-chat';

        if (!prompt && !image) {
            return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 });
        }

        // 1. Rate Limit
        if (await isRateLimited(userId)) {
            return NextResponse.json({ response: "You are sending messages too quickly. Please wait a moment." });
        }

        // Ensure chat exists
        await ensureChat(chatId, userId, 'New Conversation');

        // 2. Save User Message
        // Construct full content if image is present for DB storage
        let dbContent = prompt;
        if (image) {
            // If it's a PDF, we might want to note that
            if (image.startsWith('data:application/pdf')) {
                dbContent = `[PDF Attachment] \n${prompt}`;
            } else {
                // We don't save the full base64 to DB to avoid bloat, just a marker.
                // The frontend persists the image in localStorage.
                // The AI receives the image directly in the API call.
                dbContent = `[Image Uploaded] \n${prompt}`;
            }
        }
        await saveMessage(userId, chatId, 'user', dbContent);

        // 3. Retrieve Context (Facts + Summary + History)
        let context = "";

        // A. Facts (Existing Memory System) - DISABLED per user request for isolated context
        // if (userId !== 'anonymous') {
        //     const memories = await getMemories(userId);
        //     if (memories.length > 0) {
        //         context += formatMemoriesForContext(memories) + "\n\n";
        //     }
        // }

        // B. Conversation Summary (New System)
        const summary = await getSummary(chatId);
        if (summary) {
            context += `PREVIOUS CONVERSATION SUMMARY:\n${summary}\n\n`;
        }

        // C. Recent History (New System - from DB)
        // We fetch from DB to ensure consistency, but we can also use the client's messages if needed.
        // Using DB is safer for "Memory" features.
        const dbHistory = await getChatHistory(userId, chatId, 10);

        // Format history for Gemini
        // We need to map DB roles to Gemini roles
        const history: Content[] = dbHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // If DB history is empty (first message), use the client's messages if provided (fallback)
        // but strictly speaking, we just saved the user message, so DB history should have at least that?
        // Wait, getChatHistory returns the *previous* messages.
        // Actually, we just saved the *current* message.
        // So getChatHistory(limit=10) will include the current message if we just saved it.
        // But Gemini's `history` param in `startChat` should NOT include the *current* prompt.
        // The current prompt is sent via `sendMessage` or `generateContent`.
        // So we should exclude the very last message if it matches the current prompt?
        // Or just fetch history *excluding* the one we just saved?
        // `getChatHistory` returns ordered by time.
        // Let's filter out the current message from history passed to `startChat`.
        // Actually, `getGeminiResponse` handles `prompt` separately.
        // So `history` should be *prior* turns.

        // Let's refine `getChatHistory` usage.
        // If we just saved the message, it's in the DB.
        // We want history *before* this message.
        // But `saveMessage` doesn't return ID.
        // Simple fix: Fetch 11 messages, remove the most recent one (which is the current one).
        // Or just use the `messages` passed from client for the *immediate* turn history, 
        // but rely on DB for older context (summary).
        // Using client messages is faster and avoids DB read-after-write lag/consistency issues.
        // Let's stick to client messages for the *immediate* history passed to Gemini, 
        // but use DB for the *summary* context.
        // This is a hybrid approach: DB for long-term (summary), Client for short-term (UI state).
        // But wait, the user wants "robust AI memory".
        // If the user refreshes, client history is gone (unless localStorage).
        // If we rely on client messages, we are trusting the client.
        // Let's use the `messages` from the request for the `history` param, as it's what the user sees.
        // But we inject the `summary` from DB into the `context`.

        const clientHistory = messages ? messages.slice(-10).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        })) : [];

        // 4. Get AI Response
        let rawResponse = "";
        try {
            rawResponse = await getGeminiResponse(prompt, image, context, clientHistory);
        } catch (error: any) {
            console.error("Gemini API Error:", error);
            if (error.message?.includes('429') || error.status === 429) {
                return NextResponse.json({
                    response: "I'm currently overloaded with requests. Please wait a moment before trying again."
                });
            }
            throw error; // Re-throw other errors to be caught by outer try-catch
        }

        // 5. Parse Response for Auto-Memory JSON
        let finalResponse = rawResponse;
        let parsedMemory: {
            auto_memory?: {
                store?: { key: string; value: string }[];
                forget?: string[];
                reason?: string;
            };
            action?: string;
            freepik_prompt?: string
        } | null = null;

        // Robust JSON extraction (Same as before)
        try {
            let marker = '"auto_memory"';
            let markerIndex = rawResponse.indexOf(marker);

            if (markerIndex === -1) {
                marker = '"freepik_prompt"';
                markerIndex = rawResponse.indexOf(marker);
            }

            if (markerIndex !== -1) {
                for (let i = markerIndex; i >= 0; i--) {
                    if (rawResponse[i] === '{') {
                        let balance = 1;
                        let endIndex = -1;
                        let inString = false;

                        for (let j = i + 1; j < rawResponse.length; j++) {
                            const char = rawResponse[j];
                            if (char === '"' && rawResponse[j - 1] !== '\\') {
                                inString = !inString;
                            }

                            if (!inString) {
                                if (char === '{') balance++;
                                else if (char === '}') balance--;
                            }

                            if (balance === 0) {
                                endIndex = j;
                                break;
                            }
                        }

                        if (endIndex !== -1) {
                            const potentialJson = rawResponse.substring(i, endIndex + 1);
                            try {
                                const parsed = JSON.parse(potentialJson);

                                if (parsed.auto_memory) {
                                    parsedMemory = parsed;
                                    const before = rawResponse.substring(0, i);
                                    const after = rawResponse.substring(endIndex + 1);
                                    let cleanBefore = before.trim();
                                    let cleanAfter = after.trim();

                                    if (cleanBefore.endsWith('```json')) cleanBefore = cleanBefore.substring(0, cleanBefore.length - 7);
                                    else if (cleanBefore.endsWith('```')) cleanBefore = cleanBefore.substring(0, cleanBefore.length - 3);

                                    if (cleanAfter.startsWith('```')) cleanAfter = cleanAfter.substring(3);

                                    finalResponse = (cleanBefore + '\n' + cleanAfter).trim();
                                    break;
                                }

                                if ((parsed.action === 'generate_image' && parsed.freepik_prompt) || parsed.freepik_prompt) {
                                    const before = rawResponse.substring(0, i);
                                    const after = rawResponse.substring(endIndex + 1);
                                    let cleanBefore = before.trim();
                                    let cleanAfter = after.trim();

                                    if (cleanBefore.endsWith('```json')) cleanBefore = cleanBefore.substring(0, cleanBefore.length - 7);
                                    else if (cleanBefore.endsWith('```')) cleanBefore = cleanBefore.substring(0, cleanBefore.length - 3);

                                    if (cleanAfter.startsWith('```')) cleanAfter = cleanAfter.substring(3);

                                    finalResponse = (cleanBefore + '\n' + cleanAfter).trim();

                                    if (!finalResponse) {
                                        finalResponse = `Generating image based on prompt: "${parsed.freepik_prompt}"...`;
                                    }

                                    // Save the AI response (the text part)
                                    await saveMessage(userId, chatId, 'ai', finalResponse);

                                    return NextResponse.json({
                                        response: finalResponse,
                                        action: 'generate_image',
                                        freepik_prompt: parsed.freepik_prompt
                                    });
                                }

                            } catch {
                                // Continue searching
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error extracting JSON:", e);
        }

        // 6. Save AI Response (Normal Text)
        await saveMessage(userId, chatId, 'ai', finalResponse);

        // 7. Process Auto-Memory (Facts)
        if (parsedMemory && parsedMemory.auto_memory && userId !== 'anonymous') {
            try {
                const { store, forget, reason } = parsedMemory.auto_memory;
                if (store && Array.isArray(store)) {
                    for (const item of store) {
                        if (item.key && item.value) {
                            await saveMemory(userId, item.key, item.value, reason);
                        }
                    }
                }
                if (forget && Array.isArray(forget)) {
                    for (const key of forget) {
                        await forgetMemory(userId, key);
                    }
                }
            } catch (e) {
                console.error("Error processing memory operations:", e);
            }
        }

        // 8. Summarization Check (Simple Logic)
        // If history length is multiple of 20, trigger summarization
        // We use the client history length as a proxy for now
        if (messages && messages.length > 0 && messages.length % 20 === 0) {
            // Generate summary
            // For now, we just log it. Implementing full recursive summarization requires another AI call.
            // We can do it in background if Vercel allows, or just skip for this iteration.
            // Let's just save a placeholder summary to prove it works.
            // await saveSummary(chatId, "Conversation reached 20 messages. Summary placeholder.");
            // Ideally: Call Gemini to summarize the last 20 messages.
            // const summaryPrompt = "Summarize the following conversation...";
            // const newSummary = await getGeminiResponse(summaryPrompt, undefined, undefined, clientHistory);
            // await saveSummary(chatId, newSummary);
        }

        return NextResponse.json({ response: finalResponse });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
