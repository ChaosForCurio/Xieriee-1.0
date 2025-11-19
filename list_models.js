const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envFile.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    console.error("Could not find GEMINI_API_KEY in .env.local");
    process.exit(1);
}
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
