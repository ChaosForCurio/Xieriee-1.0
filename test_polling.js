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
    fs.writeFileSync('polling_output.txt', 'FREEPIK_API_KEY not found in .env.local');
    process.exit(1);
}

async function log(msg) {
    console.log(msg);
    fs.appendFileSync('polling_output.txt', msg + '\n');
}

async function test() {
    fs.writeFileSync('polling_output.txt', ''); // Clear file

    // Test 1: Kling-v2 (since docs mention it explicitly)
    const endpoint = 'https://api.freepik.com/v1/ai/image-to-video/kling-v2';
    await log('Starting task at: ' + endpoint);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-freepik-api-key': apiKey,
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                prompt: 'A cute cat',
                image: 'https://img.freepik.com/free-photo/cute-cat-playing-with-ball_23-2148938305.jpg'
            }),
        });

        if (!response.ok) {
            await log('API Error: ' + response.status + ' ' + await response.text());
        } else {
            const data = await response.json();
            await log('Task Started: ' + JSON.stringify(data, null, 2));

            if (data.data?.task_id) {
                const taskId = data.data.task_id;
                await log('Got Task ID: ' + taskId);

                const pollCandidates = [
                    `https://api.freepik.com/v1/ai/image-to-video/kling-v2/${taskId}`,
                    `https://api.freepik.com/v1/ai/image-to-video/${taskId}`,
                    `https://api.freepik.com/v1/videos/${taskId}`
                ];

                for (const url of pollCandidates) {
                    await log(`------------------------------------------------`);
                    await log(`Testing polling URL: ${url}`);
                    try {
                        const res = await fetch(url, {
                            headers: { 'x-freepik-api-key': apiKey }
                        });
                        await log(`Status: ${res.status}`);
                        if (res.ok) {
                            const json = await res.json();
                            await log('Response: ' + JSON.stringify(json));
                            await log('SUCCESS! Found working polling endpoint: ' + url);
                        } else {
                            await log('Failed with: ' + res.status + ' ' + await res.text());
                        }
                    } catch (e) {
                        await log('Error: ' + e.message);
                    }
                }
            }
        }

    } catch (e) {
        await log('Exception: ' + e.message);
    }
}

test();
