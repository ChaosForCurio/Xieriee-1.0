const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function checkModels() {
    const results = { gemini: [], groq: [] };

    // Check Gemini
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            results.gemini = data.models || data;
        } else {
            results.gemini = "No API Key";
        }
    } catch (error) {
        results.gemini = { error: error.message };
    }

    // Check Groq
    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const response = await groq.models.list();
        results.groq = response.data;
    } catch (error) {
        results.groq = { error: error.message };
    }

    fs.writeFileSync('models.json', JSON.stringify(results, null, 2));
    console.log("Models saved to models.json");
}

checkModels();
