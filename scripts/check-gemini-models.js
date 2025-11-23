const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to get client
        // Actually, the SDK has a listModels method on the client or similar?
        // Let's check the docs or just try to use the model manager if available.
        // The error message said "Call ListModels to see the list of available models".
        // In the Node SDK, it's usually via the model manager or just not directly exposed easily in the simplified client.
        // Let's try to just make a simple generation call to a known stable model to see if it works, 
        // or use the REST API to list models.

        // Using REST API for listing models is safer/easier without full SDK setup sometimes.
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("Available Models:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
