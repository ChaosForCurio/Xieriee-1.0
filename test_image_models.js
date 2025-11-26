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
    fs.writeFileSync('image_test_output.txt', 'FREEPIK_API_KEY not found in .env.local');
    process.exit(1);
}

async function log(msg) {
    console.log(msg);
    fs.appendFileSync('image_test_output.txt', msg + '\n');
}

async function test() {
    fs.writeFileSync('image_test_output.txt', ''); // Clear file

    const tests = [
        {
            name: 'Mystic with 16:9 Aspect Ratio',
            endpoint: 'https://api.freepik.com/v1/ai/mystic',
            body: { prompt: 'A cute cat', aspect_ratio: '16:9' }
        },
        {
            name: 'Mystic with "widescreen" Aspect Ratio',
            endpoint: 'https://api.freepik.com/v1/ai/mystic',
            body: { prompt: 'A cute cat', aspect_ratio: 'widescreen' }
        }
    ];

    for (const t of tests) {
        await log('------------------------------------------------');
        await log(`Testing ${t.name}: ${t.endpoint}`);
        await log('Body: ' + JSON.stringify(t.body));

        try {
            const response = await fetch(t.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-freepik-api-key': apiKey,
                    'Accept': 'application/json',
                },
                body: JSON.stringify(t.body),
            });

            if (!response.ok) {
                await log('API Error: ' + response.status + ' ' + await response.text());
            } else {
                const data = await response.json();
                await log('SUCCESS! Response: ' + JSON.stringify(data, null, 2));
            }

        } catch (e) {
            await log('Exception: ' + e.message);
        }
    }
}

test();
