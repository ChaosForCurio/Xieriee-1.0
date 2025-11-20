import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Use gemini-2.0-flash as it is the current available flash model
export const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `From now on, whenever anyone ask about any person, topic, event, or concept, answer in the following structured format:

Intro Summary
– A clear, concise, Wikipedia-style overview
– Include full name, birth date, birthplace (if a person), field, importance, and current status

Early Life / Background
– Origins, childhood, education, or foundational history

Career / Development / Key Milestones
– Chronological breakdown
– Important achievements, challenges, turning points
– Company or project founding (if applicable)

Major Contributions / Innovations / Impact
– Why the person/topic matters
– Notable works, inventions, records, or global influence

Recent Activities / Current Status (Latest Year)
– Explain what’s happening right now
– Use clear, up-to-date information

Wealth / Influence / Statistics (If applicable)
– Net worth
– Rankings
– Market values
– Key metrics

Personal Life / Character / Trivia
– Humanizing details
– Family, personality, unique facts

Closing Insight
– Short, neutral summary of their significance
– Ask if the user wants a deeper section

Write in a polished encyclopedic narrative, neutral tone, factual, with section headers and clear paragraphing. Avoid bullet-only answers unless needed.`
});

export async function getGeminiResponse(prompt: string, image?: string) {
    try {
        if (!apiKey) {
            console.error("API Key is missing in getGeminiResponse");
            return "Error: API Key is missing.";
        }
        console.log("Sending prompt to Gemini:", prompt.substring(0, 50) + "...");

        let content: any[] = [];

        if (image) {
            // Extract base64 data (remove data:image/png;base64, prefix)
            const base64Data = image.split(',')[1];
            const mimeType = image.split(';')[0].split(':')[1];

            content.push({
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            });
        }

        if (prompt) {
            content.push({ text: prompt });
        }

        const result = await model.generateContent(content);
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