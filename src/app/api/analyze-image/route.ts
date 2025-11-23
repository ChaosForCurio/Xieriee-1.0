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

        const analysisPromise = getGeminiResponse(prompt, image, "", []);

        const response = await Promise.race([analysisPromise, timeoutPromise]) as string;

        console.log("Step 4: Response received from Gemini:", response.substring(0, 50) + "...");

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
