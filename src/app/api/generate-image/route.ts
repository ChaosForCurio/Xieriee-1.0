import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.FREEPIK_API_KEY;
        if (!apiKey) {
            console.error('FREEPIK_API_KEY is not configured');
            return NextResponse.json(
                { error: 'Image generation service not configured' },
                { status: 500 }
            );
        }

        console.log('Calling Freepik Mystic API with prompt:', prompt);

        // 1. Initiate Image Generation (Async)
        const response = await fetch('https://api.freepik.com/v1/ai/mystic', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-freepik-api-key': apiKey,
            },
            body: JSON.stringify({
                prompt: prompt,
                aspect_ratio: "square_1_1",
                // Optional parameters based on docs
                // resolution: "2k",
                // model: "realism" 
            }),
        });

        const initialData = await response.json();

        console.log('Freepik Mystic Init Response Status:', response.status);

        if (!response.ok) {
            console.error('Freepik Mystic Init Error:', JSON.stringify(initialData, null, 2));
            return NextResponse.json(
                {
                    error: initialData.message || initialData.error || 'Failed to initiate image generation',
                    details: initialData
                },
                { status: response.status }
            );
        }

        const taskId = initialData.data?.task_id;
        if (!taskId) {
            console.error('No task_id returned:', initialData);
            return NextResponse.json(
                { error: 'No task_id returned from API', details: initialData },
                { status: 500 }
            );
        }

        console.log('Task initiated, ID:', taskId);

        // 2. Poll for Completion
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds max (2s interval)
        let finalData = null;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
            attempts++;

            const checkResponse = await fetch(`https://api.freepik.com/v1/ai/mystic/${taskId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'x-freepik-api-key': apiKey,
                },
            });

            const checkData = await checkResponse.json();
            const status = checkData.data?.status;

            console.log(`Polling attempt ${attempts}: Status = ${status}`);

            if (status === 'COMPLETED') {
                finalData = checkData;
                break;
            } else if (status === 'FAILED') {
                console.error('Image generation failed during polling:', checkData);
                return NextResponse.json(
                    { error: 'Image generation failed', details: checkData },
                    { status: 500 }
                );
            }
            // If IN_PROGRESS or PENDING, continue loop
        }

        if (!finalData) {
            return NextResponse.json(
                { error: 'Image generation timed out' },
                { status: 504 }
            );
        }

        console.log('✅ Image generation completed');

        // Extract image URL - Mystic returns generated array
        // Structure: data.data.generated[0].base64 or url
        const generatedItem = finalData.data?.generated?.[0];
        let imageUrl: string | undefined;

        if (typeof generatedItem === 'string') {
            imageUrl = generatedItem;
        } else {
            imageUrl = generatedItem?.base64
                ? `data:image/png;base64,${generatedItem.base64}`
                : generatedItem?.url;
        }

        if (!imageUrl) {
            console.error('No image URL in final response:', finalData);
            return NextResponse.json(
                { error: 'No image URL returned from API', details: finalData },
                { status: 500 }
            );
        }

        // Return the generated image data
        return NextResponse.json({
            success: true,
            data: {
                image: {
                    url: imageUrl
                }
            },
        });

    } catch (error) {
        console.error('Image generation error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
