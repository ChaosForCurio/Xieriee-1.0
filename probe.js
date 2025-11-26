const fs = require('fs');

const endpoints = [
    'https://api.freepik.com/v1/ai/text-to-video/dummy',
    'https://api.freepik.com/v1/videos/dummy',
    'https://api.freepik.com/v1/ai/videos/dummy',
    'https://api.freepik.com/v1/ai/tasks/dummy'
];

async function probe() {
    let output = '';
    for (const url of endpoints) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            output += `${url}: ${res.status}\n`;
        } catch (e) {
            output += `${url}: Error ${e.message}\n`;
        }
    }
    fs.writeFileSync('probe_output.txt', output);
}

probe();
