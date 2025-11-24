import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { isRateLimited } from '@/lib/db-actions';

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

        const { prompt, image } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const apiKey = process.env.FREEPIK_API_KEY;
        if (!apiKey) {
            console.error('FREEPIK_API_KEY is not configured');
            return NextResponse.json({ error: 'Image generation service not configured' }, { status: 500 });
        }

        let finalPrompt = prompt;
        const requestBody: { prompt: string; structure_reference?: string; structure_strength?: number; aspect_ratio?: string } = {
            prompt: prompt,
        };

        if (image) {
            console.log('Image provided for image-to-image generation');
            finalPrompt = `${prompt}, futuristic, cinematic, high detail, ultra sharp`;
            requestBody.prompt = finalPrompt;

            const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
            requestBody.structure_reference = base64Data;
            requestBody.structure_strength = 80;
        } else {
            requestBody.aspect_ratio = "square_1_1";
        }

        console.log('Calling Freepik Mystic API...');

        // 5-minute timeout for the initial request (though it should be fast)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        try {
            const response = await fetch('https://api.freepik.com/v1/ai/mystic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-freepik-api-key': apiKey,
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const responseText = await response.text();
            console.log('Freepik Mystic Init Response Status:', response.status);

            let initialData;
            try {
                initialData = JSON.parse(responseText);
            } catch {
                console.error('Failed to parse Freepik response as JSON:', responseText);
                return NextResponse.json({
                    error: 'Invalid response from Image Generation API',
                    details: responseText.substring(0, 1000)
                }, { status: 500 });
            }

            if (!response.ok) {
                console.error('Freepik Mystic Init Error:', JSON.stringify(initialData, null, 2));
                return NextResponse.json(
                    {
                        error: initialData.message || initialData.error || 'Failed to initiate image generation',
                        details: initialData,
                    },
                    { status: response.status }
                );
            }

            const taskId = initialData.data?.task_id;
            if (!taskId) {
                console.error('No task_id returned:', initialData);
                return NextResponse.json({ error: 'No task_id returned from API', details: initialData }, { status: 500 });
            }

            console.log('Task initiated, ID:', taskId);

            // Poll for completion
            let attempts = 0;
            const maxAttempts = 90; // 90 * 2s = 180s (3 mins) polling limit
            let finalData: { data?: { generated?: (string | { base64?: string; url?: string })[] } } | null = null;

            while (attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                attempts++;

                const checkResponse = await fetch(`https://api.freepik.com/v1/ai/mystic/${taskId}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'x-freepik-api-key': apiKey,
                    },
                });

                const checkResponseText = await checkResponse.text();
                let checkData;
                try {
                    checkData = JSON.parse(checkResponseText);
                } catch {
                    console.error('Failed to parse polling response:', checkResponseText);
                    continue; // Try again next loop
                }
                const status = checkData.data?.status;

                if (attempts % 5 === 0) console.log(`Polling attempt ${attempts}: Status = ${status}`);

                if (status === 'COMPLETED') {
                    finalData = checkData;
                    break;
                } else if (status === 'FAILED') {
                    console.error('Image generation failed during polling:', checkData);
                    return NextResponse.json({ error: 'Image generation failed', details: checkData }, { status: 500 });
                }
            }

            if (!finalData) {
                return NextResponse.json({ error: 'Image generation timed out' }, { status: 504 });
            }

            console.log('✅ Image generation completed');

            const generatedItem = finalData.data?.generated?.[0];
            let imageUrl: string | undefined;

            if (typeof generatedItem === 'string') {
                imageUrl = generatedItem;
            } else {
                imageUrl = generatedItem?.base64
                    ? `data:image/png;base64,${generatedItem.base64}`
                    : generatedItem?.url;
            }

            if (imageUrl) {
                return NextResponse.json({
                    success: true,
                    data: {
                        image: {
                            url: imageUrl,
                        },
                    },
                });
            } else {
                console.error('No image URL in final response:', finalData);
                return NextResponse.json({ error: 'No image URL returned from API', details: finalData }, { status: 500 });
            }

        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
            }
            throw fetchError;
        }

    } catch (error: unknown) {
        console.error('Image generation error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
