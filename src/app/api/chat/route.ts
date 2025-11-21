import { NextResponse } from 'next/server';
import { getGeminiResponse } from '@/lib/gemini';

import { stackServerApp } from '@/stack';
import { getMemories, saveMemory, forgetMemory, formatMemoriesForContext } from '@/lib/memory';

export async function POST(request: Request) {
    try {
        const user = await stackServerApp.getUser();
        const userId = user?.id;

        const { prompt, image, messages } = await request.json();

        if (!prompt && !image) {
            return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 });
        }

        // 1. Retrieve Context & Memories
        let context = "";
        if (userId) {
            const memories = await getMemories(userId);
            context = formatMemoriesForContext(memories);
            console.log(`[Chat API] User: ${userId}, Memories found: ${memories.length}`);
        } else {
            console.log('[Chat API] No userId found');
        }

        // 2. Get AI Response with Context & History
        // Format history for Gemini (exclude current prompt which is passed separately)
        // Limit history to last 10 messages to avoid token limits
        const history = messages ? messages.slice(-10).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        })) : [];

        const rawResponse = await getGeminiResponse(prompt, image, context, history);

        // 3. Parse Response for Auto-Memory JSON
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

        // Robust JSON extraction: Find "auto_memory" and extract the surrounding JSON object
        try {
            let marker = '"auto_memory"';
            let markerIndex = rawResponse.indexOf(marker);

            // If auto_memory not found, check for freepik_prompt
            if (markerIndex === -1) {
                marker = '"freepik_prompt"';
                markerIndex = rawResponse.indexOf(marker);
            }

            if (markerIndex !== -1) {
                // Find the opening brace '{' before the marker

                // Scan backwards from marker to find the container '{'
                // We need to be careful about nested braces, but usually "auto_memory" is a top-level key
                // or inside the root object. Let's assume it's a key in the root object: { "auto_memory": ... }
                // So we look for the *last* '{' before the marker that isn't closed.
                // Actually, simpler: Find the nearest '{' before marker? No, that might be inside a string.

                // Better approach: Find the first '{' in the string that starts a block containing "auto_memory".
                // But the text might contain '{' too.

                // Let's try to find the *start* of the JSON block.
                // It usually starts with `{`.
                // Let's look for the last `{` before the marker that seems to be the start of the object.

                // Alternative: Regex to find the start of the JSON structure
                // The structure is always `{ ... "auto_memory": ... }`
                // Let's find the index of `{` that is the root of this.

                // Let's try a brace counter from the very beginning of the potential JSON area.
                // Since we don't know where it starts, let's look for the first '{' that eventually leads to "auto_memory".

                // Let's try a simpler heuristic that works 99% of the time for this specific prompt:
                // The model outputs JSON at the start or end.
                // If at end, it looks like: ... text ... { "auto_memory": ... }

                // 1. Find the last occurrence of "```json" or "```" before the marker?
                // 2. Or just find the `{` that encloses "auto_memory".

                // Let's scan backwards from "auto_memory" to find the opening brace.
                for (let i = markerIndex; i >= 0; i--) {
                    if (rawResponse[i] === '{') {
                        // Potential start. Check if it's valid JSON from here.
                        // We need to find the matching closing brace.
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

                                // Handle Auto Memory
                                if (parsed.auto_memory) {
                                    parsedMemory = parsed;

                                    // Define cleanBefore and cleanAfter for auto_memory
                                    const before = rawResponse.substring(0, i);
                                    const after = rawResponse.substring(endIndex + 1);
                                    let cleanBefore = before.trim();
                                    let cleanAfter = after.trim();

                                    // Clean up markdown ticks
                                    if (cleanBefore.endsWith('```json')) {
                                        cleanBefore = cleanBefore.substring(0, cleanBefore.length - 7);
                                    } else if (cleanBefore.endsWith('```')) {
                                        cleanBefore = cleanBefore.substring(0, cleanBefore.length - 3);
                                    }

                                    if (cleanAfter.startsWith('```')) {
                                        cleanAfter = cleanAfter.substring(3);
                                    }

                                    finalResponse = (cleanBefore + '\n' + cleanAfter).trim();
                                    break; // Found it
                                }

                                // Handle Image Generation Action
                                // Check for action OR just freepik_prompt (in case AI forgets action)
                                if ((parsed.action === 'generate_image' && parsed.freepik_prompt) || parsed.freepik_prompt) {
                                    // Define cleanBefore and cleanAfter for image generation
                                    const before = rawResponse.substring(0, i);
                                    const after = rawResponse.substring(endIndex + 1);
                                    let cleanBefore = before.trim();
                                    let cleanAfter = after.trim();

                                    // Clean up markdown ticks
                                    if (cleanBefore.endsWith('```json')) {
                                        cleanBefore = cleanBefore.substring(0, cleanBefore.length - 7);
                                    } else if (cleanBefore.endsWith('```')) {
                                        cleanBefore = cleanBefore.substring(0, cleanBefore.length - 3);
                                    }

                                    if (cleanAfter.startsWith('```')) {
                                        cleanAfter = cleanAfter.substring(3);
                                    }

                                    finalResponse = (cleanBefore + '\n' + cleanAfter).trim();

                                    // If finalResponse is empty (AI only returned JSON), set a default message
                                    if (!finalResponse) {
                                        finalResponse = `Generating image based on prompt: "${parsed.freepik_prompt}"...`;
                                    }

                                    return NextResponse.json({
                                        response: finalResponse,
                                        action: 'generate_image',
                                        freepik_prompt: parsed.freepik_prompt
                                    });
                                }

                            } catch {
                                // Not valid JSON, continue searching
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error extracting JSON:", e);
        }

        if (parsedMemory && parsedMemory.auto_memory && userId) {
            try {
                const { store, forget, reason } = parsedMemory.auto_memory;

                // Execute memory operations asynchronously
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

        return NextResponse.json({ response: finalResponse });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
