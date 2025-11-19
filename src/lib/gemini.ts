import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Use gemini-2.0-flash as it is the current available flash model
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
        if (error.message?.includes("API key not valid")) {
            return "Configuration Error: The Gemini API key is invalid. Please check your `.env.local` file and ensure `GEMINI_API_KEY` is correct.";
        }
        return `Sorry, I encountered an error processing your request. Details: ${error.message || "Unknown error"}`;
    }
}