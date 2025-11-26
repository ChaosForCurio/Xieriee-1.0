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
    console.error('FREEPIK_API_KEY not found');
    process.exit(1);
}

function log(msg) {
    console.log(msg);
    fs.appendFileSync('image_full_output.txt', msg + '\n');
}

async function test() {
    fs.writeFileSync('image_full_output.txt', '');
    log('Starting full image generation test...');

    // 1. Start Task
    const response = await fetch('https://api.freepik.com/v1/ai/mystic', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-freepik-api-key': apiKey,
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            prompt: 'A cute robot',
            aspect_ratio: 'square_1_1'
        }),
    });

    if (!response.ok) {
        log('Start failed: ' + await response.text());
        return;
    }

    const data = await response.json();
    log('Start Response: ' + JSON.stringify(data, null, 2));

    const taskId = data.data?.task_id;
    if (!taskId) {
        log('No task ID returned');
        return;
    }

    // 2. Poll
    log(`Polling task ${taskId}...`);
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));

        const res = await fetch(`https://api.freepik.com/v1/ai/mystic/${taskId}`, {
            headers: { 'x-freepik-api-key': apiKey }
        });

        if (!res.ok) {
            log('Poll failed: ' + await res.text());
            continue;
        }

        const pollData = await res.json();
        log(`Status: ${pollData.data?.status}`);

        if (pollData.data?.status === 'COMPLETED') {
            log('COMPLETED! Final Response:');
            log(JSON.stringify(pollData, null, 2));

            // Check where the URL is
            const generated = pollData.data.generated;
            if (generated && generated.length > 0) {
                log('Image URL: ' + (generated[0].url || generated[0].base64));
            } else {
                log('No generated items found in data.generated');
            }
            return;
        }
    }
}

test();
