import { NextResponse } from 'next/server';
import { getGeminiResponse } from '@/lib/gemini';

export async function POST(request: Request) {
    try {
        console.log("Step 1: Request received");
        const { prompt, image } = await request.json();
        console.log("Step 2: JSON parsed");

        if (!prompt || !image) {
            console.log("Error: Missing prompt or image");
            return NextResponse.json({ error: 'Prompt and image are required' }, { status: 400 });
        }

        console.log("Analyzing image with prompt:", prompt.substring(0, 50) + "...");

        // 2-minute timeout for analysis
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Analysis timed out')), 300000)
        );

        // Call Gemini directly without DB/Memory context
        console.log("Step 3: Calling getGeminiResponse");

        let responseText: string;

        try {
            // Try Gemini first
            responseText = await getGeminiResponse(
                prompt,
                image,
                undefined,
                undefined,
                "You are an expert image analysis AI. Your task is to analyze the provided image and generate a highly detailed, descriptive prompt that can be used to re-generate a similar image using an AI image generator. Focus on the subject, art style, lighting, color palette, and composition. Output ONLY the prompt text. Do NOT output JSON. Do NOT include any introductory or concluding text."
            );
        } catch (geminiError: any) {
            console.warn("Gemini analysis failed, falling back to Groq:", geminiError);
            try {
                // Fallback to Groq
                const { analyzeImageWithGroq } = await import("@/lib/groq");
                responseText = await analyzeImageWithGroq(image, prompt);
            } catch (groqError: any) {
                console.error("Groq fallback also failed:", groqError);
                // Throw a combined error so the user knows both failed
                throw new Error(`Analysis failed. Gemini: ${geminiError.message}. Groq: ${groqError.message}`);
            }
        }

        const analysisPromise = Promise.resolve(responseText); // Wrap responseText in a resolved promise for Promise.race
        const response = await Promise.race([analysisPromise, timeoutPromise]) as string;

        console.log("Step 4: Response received from AI:", response.substring(0, 50) + "...");

        // Clean up response to remove auto_memory JSON if present
        let cleanResponse = response;

        // 1. Remove markdown code blocks containing auto_memory
        cleanResponse = cleanResponse.replace(/```json[\s\S]*?"auto_memory"[\s\S]*?```/g, "");

        // 2. Remove raw JSON objects containing auto_memory (in case no markdown)
        cleanResponse = cleanResponse.replace(/\{[\s\S]*?"auto_memory"[\s\S]*?\}/g, "");

        // 3. Remove any leftover markdown markers or empty lines at start/end
        cleanResponse = cleanResponse.replace(/```json/g, "").replace(/```/g, "").trim();

        console.log("Analysis complete. Cleaned response length:", cleanResponse.length);

        return NextResponse.json({ response: cleanResponse });
    } catch (error: any) {
        console.error('Analyze Image API Error:', error);
        const status = error.message === 'Analysis timed out' ? 504 : 500;
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
    }
}
