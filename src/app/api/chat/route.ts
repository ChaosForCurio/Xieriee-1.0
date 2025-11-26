import { NextResponse } from 'next/server';
import { getGeminiResponse } from '@/lib/gemini';
import { getGroqResponse } from '@/lib/groq';
import { stackServerApp } from '@/stack';
import { getMemories, saveMemory, forgetMemory, formatMemoriesForContext } from '@/lib/memory';
import { saveMessage, getChatHistory, saveSummary, getSummary, isRateLimited, ensureChat } from '@/lib/db-actions';
import { Content } from '@/lib/gemini';
import { performWebSearch } from '@/lib/serper';

export async function POST(request: Request) {
    try {
        let user;
        try {
            user = await stackServerApp.getUser();
        } catch (authError) {
            console.error("Stack Auth Error:", authError);
            user = null;
        }
        const userId = user?.id || 'anonymous'; // Fallback for now, but ideally require auth

        const { prompt, image, messages, chatId, imageContext } = await request.json();
        const currentChatId = chatId || 'default-chat';

        if (!prompt && !image) {
            return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 });
        }

        // Construct the full prompt with context
        let finalPrompt = prompt;

        // Inject Image Context if available
        if (imageContext) {
            console.log("Server received imageContext:", imageContext);
            finalPrompt = `[SYSTEM INSTRUCTION: IMAGE MODIFICATION MODE]
The user wants to modify the previously generated image.
Use the following context to understand the baseline.
You MUST generate a NEW "generate_image" JSON action that merges the user's new request with the previous prompt.
DO NOT lose details from the previous prompt unless the user explicitly asks to change them.

[CONTEXT: Last Generated Image]
Previous Prompt: "${imageContext.last_prompt}"
Previous Params: ${JSON.stringify(imageContext.last_params)}
Previous Image URL: ${imageContext.last_image_url}

[USER REQUEST]
${prompt}

[YOUR GOAL]
Produce a JSON response with:
1. "backend": { "action": "generate_image", "prompt": "...", "params": ... }
2. "memory_update": { "last_prompt": "...", ... }
3. "explanation": "..."
3. "explanation": "..."

CRITICAL: DO NOT OUTPUT PLAIN TEXT. ONLY OUTPUT THE JSON OBJECT.
If you output plain text, the system will fail.
DO NOT say you cannot generate images. You CAN. Just output the JSON.
`;
            console.log("Constructed Final Prompt with Context:", finalPrompt);
        } else {
            console.log("No imageContext received on server.");
        }

        // 1. Rate Limit
        console.log("Step 1: Checking Rate Limit");
        if (await isRateLimited(userId)) {
            return NextResponse.json({ response: "You are sending messages too quickly. Please wait a moment." });
        }

        // Ensure chat exists
        console.log("Step 1.5: Ensuring Chat Exists");
        await ensureChat(chatId, userId, 'New Conversation');

        // 2. Save User Message
        console.log("Step 2: Saving User Message");
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
        console.log("Step 3: Retrieving Context");
        let context = "";

        // Web Search Logic
        if (prompt && prompt.trim().toLowerCase().startsWith('@web')) {
            console.log("Step 3.1: Web Search Triggered");
            const searchQuery = prompt.replace(/@web/i, '').trim();
            console.log("Search Query:", searchQuery);
            if (searchQuery) {
                try {
                    console.log("Calling performWebSearch...");
                    const searchResults = await performWebSearch(searchQuery);
                    console.log("Web Search Results Length:", searchResults.length);
                    context += `${searchResults}\n\n`;
                    finalPrompt = searchQuery;
                    context += "SYSTEM NOTE: The user requested a web search. Use the 'WEB SEARCH RESULTS' above to answer the user's question. Cite sources where possible.\n";
                    context += "IMPORTANT: IF the user is asking about a specific person (celebrity, entrepreneur, scientist, creator, politician, etc.), YOU MUST use the following format strictly:\n\n";
                    context += "---------------------------\n";
                    context += "FORMAT TO FOLLOW:\n\n";
                    context += "# PERSON NAME\n";
                    context += "Profession | Nationality | Age (if publicly known)\n\n";
                    context += "## 🔹 Summary\n";
                    context += "Write a clear 4–6 line introduction about who the person is and why they are notable.\n";
                    context += "Add citations at the end of the section.\n\n";
                    context += "## 🔹 Basic Information\n";
                    context += "- Full Name:\n";
                    context += "- Born:\n";
                    context += "- Nationality:\n";
                    context += "- Profession(s):\n\n";
                    context += "## 🔹 Major Achievements\n";
                    context += "List the most important 3–6 achievements, awards, milestones, or recognitions with citations.\n\n";
                    context += "## 🔹 Notable Works / Contributions\n";
                    context += "List their key works (movies, books, inventions, companies, research, etc.). Use citations.\n\n";
                    context += "## 🔹 Recent News (if available)\n";
                    context += "Summarize any important news from the past 30–90 days. Add citations.\n\n";
                    context += "## 🔹 Public Profiles\n";
                    context += "List official website and public social media links (no private or speculative info).\n\n";
                    context += "## 🔹 Sources\n";
                    context += "Display the list of citations used.\n";
                    context += "---------------------------\n\n";
                    context += "If certain details are not available publicly, write: “Not publicly available.”\n";
                    context += "Never add or guess private data.\n";
                    context += "Never skip the structure.\n\n";
                } catch (searchError) {
                    console.error("Error during performWebSearch:", searchError);
                    context += "SYSTEM NOTE: Web search failed. Please inform the user.\n\n";
                }
            } else {
                context += "SYSTEM NOTE: The user typed @web but provided no query. Ask them what they want to search for.\n\n";
            }
        }

        // Video Generation Logic
        if (prompt && prompt.trim().toLowerCase().startsWith('@video')) {
            console.log("Step 3.2: Video Generation Triggered");
            const videoPrompt = prompt.replace(/@video/i, '').trim();

            if (videoPrompt) {
                // We return a special JSON response to tell the frontend to trigger the video generation
                // or we can handle it here if we want the AI to "say" something about it.
                // However, the current architecture seems to rely on the AI returning a JSON action for images.
                // Let's replicate that pattern for videos.

                // We'll inject a system note to force the AI to generate the video action JSON.
                context += `SYSTEM INSTRUCTION: The user wants to generate a video with the prompt: "${videoPrompt}".\n`;
                context += `You MUST return a JSON response with the action "generate_video" and the prompt "${videoPrompt}".\n`;
                context += `Do not output plain text. Output ONLY the JSON object.\n`;
                context += `Example: { "action": "generate_video", "freepik_prompt": "${videoPrompt}" }\n`;

                finalPrompt = `Generate a video for: ${videoPrompt}`;
            } else {
                context += "SYSTEM NOTE: The user typed @video but provided no prompt. Ask them what video they want to generate.\n\n";
            }
        }

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
        console.log("Step 3.5: Fetching Chat History");
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

        const clientHistory: Content[] = messages ? messages.slice(-10).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        })) : [];

        // 4. Get AI Response
        let rawResponse = "";
        try {
            // @ts-ignore
            rawResponse = await getGeminiResponse(finalPrompt, image, context, clientHistory);
            console.log("Gemini Raw Response:", rawResponse);
        } catch (error: any) {
            console.error("Gemini API Error:", error);

            console.log("Attempting fallback to Groq...");
            try {
                // Fallback to Groq
                // Note: Groq implementation here is text-only for now.
                rawResponse = await getGroqResponse(finalPrompt, clientHistory, context);
                console.log("Groq Response:", rawResponse);
            } catch (groqError) {
                console.error("Groq Fallback Error:", groqError);

                // Check for rate limiting or overload specifically (from original error)
                if (error.message?.includes('429') || error.status === 429) {
                    return NextResponse.json({
                        response: "I'm currently overloaded with requests. Please wait a moment before trying again."
                    });
                }

                // Handle all other errors gracefully
                return NextResponse.json({
                    response: "I encountered an internal error while processing your request. Please try again later."
                });
            }
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

            if (markerIndex === -1) {
                marker = '"web_search"';
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

                                if (parsed.action === 'web_search' && parsed.search_query) {
                                    console.log("Auto Search Triggered:", parsed.search_query);
                                    const searchQuery = parsed.search_query;

                                    // Perform the search
                                    let searchContext = "";
                                    try {
                                        const searchResults = await performWebSearch(searchQuery);
                                        searchContext = `WEB SEARCH RESULTS for "${searchQuery}":\n${searchResults}\n\n`;
                                    } catch (searchError) {
                                        console.error("Auto Search Failed:", searchError);
                                        searchContext = "SYSTEM NOTE: Web search failed. Inform the user that you could not retrieve live data.\n\n";
                                    }

                                    // Construct the follow-up prompt for the final answer
                                    const followUpPrompt = `
SYSTEM: You requested a web search for "${searchQuery}".
Here are the results:
${searchContext}

INSTRUCTIONS:
Use the results above to answer the user's original request.
You MUST follow this exact output format:

🔎 **Real-Time Web Result**
(A short, accurate summary of the findings.)

📌 **Key Facts**
•
•
•

📰 **Recent Updates**
•

🌐 **Sources**
[List all URLs returned by Serper]

Rules:
- Do NOT hallucinate.
- Use ONLY information from Serper.
- If Serper does not provide data → say “Not available”.
`;

                                    // Re-call Gemini with the search context
                                    // We append this to the conversation temporarily for this turn
                                    const finalAnswer = await getGeminiResponse(followUpPrompt, undefined, context, clientHistory);

                                    // Save the final AI response
                                    await saveMessage(userId, chatId, 'ai', finalAnswer);

                                    return NextResponse.json({
                                        response: finalAnswer
                                    });
                                    return NextResponse.json({
                                        response: finalAnswer
                                    });
                                }

                                // Handle New Full Stack Image Gen JSON
                                if (parsed.backend && parsed.backend.action === 'generate_image') {
                                    console.log("Full Stack Image Gen Triggered");

                                    // Use explanation as the text response if available
                                    if (parsed.explanation) {
                                        finalResponse = parsed.explanation;
                                    } else {
                                        finalResponse = "Generating image...";
                                    }

                                    await saveMessage(userId, chatId, 'ai', finalResponse);

                                    return NextResponse.json({
                                        response: finalResponse,
                                        backend: parsed.backend,
                                        memory_update: parsed.memory_update,
                                        explanation: parsed.explanation
                                    });
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

                                if (parsed.action === 'generate_video' && parsed.freepik_prompt) {
                                    const before = rawResponse.substring(0, i);
                                    const after = rawResponse.substring(endIndex + 1);
                                    let cleanBefore = before.trim();
                                    let cleanAfter = after.trim();

                                    if (cleanBefore.endsWith('```json')) cleanBefore = cleanBefore.substring(0, cleanBefore.length - 7);
                                    else if (cleanBefore.endsWith('```')) cleanBefore = cleanBefore.substring(0, cleanBefore.length - 3);

                                    if (cleanAfter.startsWith('```')) cleanAfter = cleanAfter.substring(3);

                                    finalResponse = (cleanBefore + '\n' + cleanAfter).trim();

                                    if (!finalResponse) {
                                        finalResponse = `Generating video based on prompt: "${parsed.freepik_prompt}"...`;
                                    }

                                    await saveMessage(userId, chatId, 'ai', finalResponse);

                                    return NextResponse.json({
                                        response: finalResponse,
                                        action: 'generate_video',
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
        console.error('API Error in /api/chat:', error);
        if (error instanceof Error) {
            console.error('Error Stack:', error.stack);
        }

        // Return a friendly error message to the user instead of a 500 error
        return NextResponse.json({
            response: "I encountered an unexpected error. Please try again later."
        });
    }
}
