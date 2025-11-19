import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function getGeminiResponse(prompt: string) {
    try {
        if (!apiKey) {
            console.error("API Key is missing in getGeminiResponse");
            return "Error: API Key is missing.";
        }
        console.log("Sending prompt to Gemini:", prompt.substring(0, 50) + "...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error: any) {
        console.error("Error fetching Gemini response:", error);
        if (error.message && error.message.includes("404")) {
            console.log("Attempting to list available models...");
            try {
                // @ts-ignore
                const models = await genAI.getGenerativeModel({ model: "gemini-pro" }).apiKey;
                // The SDK doesn't have a direct listModels on genAI instance in all versions.
                // We need to use the model manager if available, or just try a different model.
            } catch (e) {
                console.error("Could not list models", e);
            }
        }
        return `Sorry, I encountered an error processing your request. Details: ${error.message || "Unknown error"}`;
    }
}
