const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDmP_FV7iX2pKkB2HYAgXO-a-DNWEQaGpA";
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log("Fetching models via REST API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        let output = "";
        if (data.models) {
            output += "Available Models:\n";
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    output += `- ${m.name} (${m.displayName})\n`;
                }
            });
        } else {
            output += "No models found or error: " + JSON.stringify(data);
        }
        fs.writeFileSync('models_list.txt', output);
        console.log("Wrote models to models_list.txt");
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
