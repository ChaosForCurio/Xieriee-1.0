// Using built-in fetch

async function testChat() {
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: "@web test query " + Date.now(),
                messages: []
            })
        });

        console.log("Status:", response.status);
        const text = await response.text();
        const fs = require('fs');
        fs.writeFileSync('last-response.txt', text);
        try {
            console.log("Body:", JSON.stringify(JSON.parse(text), null, 2));
        } catch (e) {
            console.log("Body (Text):", text);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

testChat();
