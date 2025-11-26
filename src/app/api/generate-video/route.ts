import { NextResponse } from 'next/server';
// Force rebuild
import { stackServerApp } from '@/stack';
import { isRateLimited } from '@/lib/db-actions';
import { freepikEngine } from '@/lib/freepik/engine';

export const maxDuration = 300; // 5 minutes

export async function POST(request: Request) {
    console.log('API Route hit: /api/generate-video');
    try {
        // 0. Auth & Rate Limit Check
        const user = await stackServerApp.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isLimited = await isRateLimited(user.id);
        if (isLimited) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        const { prompt, urgent } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // 1. Generate Video using FreepikEngine
        const result = await freepikEngine.generateVideo({
            prompt,
            urgent: urgent || true,
        });

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error: any) {
        console.error('Video generation error:', error);
        const status = error.message.includes('limit reached') ? 429 : 500;
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status }
        );
    }
}
