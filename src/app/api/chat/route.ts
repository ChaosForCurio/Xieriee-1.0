import { NextResponse } from 'next/server';
import { getGeminiResponse } from '@/lib/gemini';

export async function POST(request: Request) {
    try {
        const { prompt, image } = await request.json();

        if (!prompt && !image) {
            return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 });
        }

        const response = await getGeminiResponse(prompt, image);
        return NextResponse.json({ response });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
