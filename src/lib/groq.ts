import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

let groq: Groq | null = null;

if (apiKey) {
    groq = new Groq({
        apiKey: apiKey,
    });
} else {
    console.warn("GROQ_API_KEY is not set in environment variables.");
}

export async function getGroqResponse(
    prompt: string,
    history: { role: string; parts: { text: string }[] }[] = [],
    context?: string
): Promise<string> {
    if (!groq) {
        throw new Error("Groq API key is missing.");
    }

    try {
        // Convert Gemini history format to Groq format
        const messages: any[] = history.map((msg) => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.parts[0].text,
        }));

        // Construct the final prompt with context if available
        let finalContent = prompt;
        if (context) {
            finalContent = `${context}\n\nUser Query: ${prompt}`;
        }

        // Add the current prompt as the last user message
        messages.push({
            role: 'user',
            content: finalContent,
        });

        // Add a system prompt to maintain persona if needed, or just rely on the prompt context
        // For now, we'll just send the messages.

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile", // Updated to latest versatile model
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 1,
            stop: null,
            stream: false,
        });

        return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Groq API Error:", error);
        throw error;
    }
}

export async function analyzeImageWithGroq(base64Image: string, prompt: string) {
    if (!groq) {
        throw new Error("Groq API key is missing.");
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": base64Image // Expecting full data URL (data:image/jpeg;base64,...)
                            }
                        }
                    ]
                }
            ],
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "temperature": 0.5,
            "max_tokens": 1024,
            "top_p": 1,
            "stream": false,
            "stop": null
        });

        return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("Groq API Error:", error);
        throw error;
    }
}

