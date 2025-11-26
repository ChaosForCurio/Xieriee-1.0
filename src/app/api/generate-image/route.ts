import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { isRateLimited } from '@/lib/db-actions';
import { db } from '@/db';
import { userImages } from '@/db/schema';
import { freepikEngine } from '@/lib/freepik/engine';

export const maxDuration = 300; // 5 minutes

export async function POST(request: Request) {
    console.log('API Route hit: /api/generate-image');
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

        const { prompt, image, urgent } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // 1. Generate Image using FreepikEngine
        const result = await freepikEngine.generateImage({
            prompt,
            image,
            urgent: urgent || true, // Default to urgent for now as we want immediate results
        });

        // 2. Extract Image URL
        const generatedItem = result.data?.generated?.[0];
        let imageUrl: string | undefined;

        if (typeof generatedItem === 'string') {
            imageUrl = generatedItem;
        } else {
            imageUrl = generatedItem?.base64
                ? `data:image/png;base64,${generatedItem.base64}`
                : generatedItem?.url;
        }

        if (imageUrl) {
            // 3. Save to Database
            try {
                await db.insert(userImages).values({
                    userId: user.id,
                    imageUrl: imageUrl,
                    publicId: `generated-${Date.now()}`,
                });
            } catch (dbError) {
                console.error('Failed to save generated image to DB:', dbError);
            }

            return NextResponse.json({
                success: true,
                data: {
                    image: {
                        url: imageUrl,
                    },
                },
            });
        } else {
            console.error('No image URL in final response:', result);
            return NextResponse.json({ error: 'No image URL returned from API', details: result }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Image generation error:', error);
        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

