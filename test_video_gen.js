const fs = require('fs');
const path = require('path');

// Manual .env parsing
let apiKey = '';
try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/FREEPIK_API_KEY=(.*)/);
        if (match) {
            apiKey = match[1].trim();
        }
    }
} catch (e) {
    console.error('Error reading .env.local:', e);
}

if (!apiKey) {
    console.error('FREEPIK_API_KEY not found in .env.local');
    process.exit(1);
}

async function log(msg) {
    console.log(msg);
    fs.appendFileSync('video_test_output.txt', msg + '\n');
}

async function pollTask(taskId, type, modelId) {
    const maxAttempts = 60;

    // Candidate URLs for video polling
    let candidateUrls = [];
    if (type === 'image') {
        candidateUrls.push(`https://api.freepik.com/v1/ai/mystic/${taskId}`);
    } else {
        // Try different formats for video
        candidateUrls.push(`https://api.freepik.com/v1/ai/image-to-video/${modelId}/${taskId}`);
        candidateUrls.push(`https://api.freepik.com/v1/ai/image-to-video/${taskId}`);
        candidateUrls.push(`https://api.freepik.com/v1/ai/image-to-video/tasks/${taskId}`);
        candidateUrls.push(`https://api.freepik.com/v1/ai/image-to-video/${modelId}/tasks/${taskId}`);
    }

    await log(`Polling for task ${taskId} (type: ${type})...`);

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 2000));

        for (const endpointUrl of candidateUrls) {
            // await log(`Checking ${endpointUrl}...`); // Verbose logging

            const res = await fetch(endpointUrl, {
                headers: { 'x-freepik-api-key': apiKey }
            });

            if (!res.ok) {
                if (res.status === 404) {
                    // Try next URL if 404
                    continue;
                }
                const txt = await res.text();
                await log(`Poll Error on ${endpointUrl}: ${res.status} ${txt}`);
                continue;
            }

            // If we get here, the URL is valid!
            await log(`Valid Polling URL found: ${endpointUrl}`);

            // Update candidateUrls to only use this one from now on
            candidateUrls = [endpointUrl];

            const data = await res.json();
            const status = data.data?.status;
            await log(`Poll Status: ${status}`);

            if (status === 'COMPLETED') {
                let result = '';
                if (type === 'image') {
                    const item = data.data.generated[0];
                    result = typeof item === 'string' ? item : item.url;
                } else {
                    await log('Video Completed Data: ' + JSON.stringify(data, null, 2));
                    result = data.data.video?.url || data.data.video || data.data.generated?.[0]?.url;
                }

                await log(`[${type}] COMPLETED! Result: ${result}`);
                return result;
            }

            if (status === 'FAILED') {
                throw new Error(`Task ${taskId} FAILED`);
            }

            // Break inner loop to wait and poll again
            break;
        }
    }
    throw new Error('Polling timed out or no valid endpoint found');
}

async function test() {
    await log('Starting Video Generation Test...');

    // Step 1: Generate Image
    const imagePrompt = "A futuristic cyberpunk city with neon lights, cinematic lighting, 8k resolution";
    await log(`\n[Step 1] Generating base image for prompt: "${imagePrompt}"`);

    let imageUrl = '';

    try {
        const imageEndpoint = 'https://api.freepik.com/v1/ai/mystic';
        const imageBody = {
            prompt: imagePrompt,
            aspect_ratio: 'widescreen_16_9'
        };

        const imageRes = await fetch(imageEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-freepik-api-key': apiKey,
                'Accept': 'application/json',
            },
            body: JSON.stringify(imageBody),
        });

        if (!imageRes.ok) {
            const errText = await imageRes.text();
            throw new Error(`Image Gen Failed: ${imageRes.status} ${errText}`);
        }

        const imageData = await imageRes.json();
        await log('Image Generation Response: ' + JSON.stringify(imageData, null, 2));

        // Handle response
        if (imageData.data && Array.isArray(imageData.data) && imageData.data.length > 0) {
            imageUrl = imageData.data[0].url;
        } else if (imageData.data && imageData.data.generated && imageData.data.generated.length > 0) {
            const item = imageData.data.generated[0];
            imageUrl = typeof item === 'string' ? item : item.url;
        } else if (imageData.data && imageData.data.task_id) {
            await log('Image generation returned task_id, polling needed...');
            imageUrl = await pollTask(imageData.data.task_id, 'image');
        } else {
            throw new Error('Unknown image response format');
        }

        if (!imageUrl) {
            throw new Error('Failed to extract image URL from response');
        }

        await log(`\n[Step 1 Success] Base Image URL: ${imageUrl}`);

    } catch (e) {
        await log(`[Step 1 Failed] ${e.message}`);
        return;
    }

    // Step 2: Generate Video
    await log(`\n[Step 2] Generating video from image...`);

    try {
        const modelId = 'kling-std';
        const videoEndpoint = `https://api.freepik.com/v1/ai/image-to-video/${modelId}`;

        const videoBody = {
            prompt: imagePrompt,
            image: imageUrl
        };

        await log(`Calling Video Endpoint: ${videoEndpoint}`);
        await log(`Body: ${JSON.stringify(videoBody)}`);

        const videoRes = await fetch(videoEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-freepik-api-key': apiKey,
                'Accept': 'application/json',
            },
            body: JSON.stringify(videoBody),
        });

        if (!videoRes.ok) {
            const errText = await videoRes.text();
            throw new Error(`Video Gen Failed: ${videoRes.status} ${errText}`);
        }

        const videoData = await videoRes.json();
        await log('Video Generation Initial Response: ' + JSON.stringify(videoData, null, 2));

        if (videoData.data && videoData.data.task_id) {
            await log(`Video Task ID: ${videoData.data.task_id}`);
            await pollTask(videoData.data.task_id, 'video', modelId);
        } else {
            await log('No task_id returned for video generation?');
        }

    } catch (e) {
        await log(`[Step 2 Failed] ${e.message}`);
    }
}

test();
