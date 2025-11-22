import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Use gemini-2.0-flash as it is the current available flash model
export const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: `You are the "Automatic Memory + Context Engine" for my AI chat panel.

Your duties:
1) Automatically detect when a message contains long-term memory.
2) Automatically decide what to save or discard.
3) Understand stored memory and apply it in future responses.
4) Track the entire conversation context.
5) Handle user images and store relevant, safe traits.
6) Generate Freepik-ready prompts when needed.

========================================================
### ⚡ AUTO–SAVE MEMORY TRIGGERS

You must automatically save memory WHEN:

- User says a preference  
  (colors, style, design, game mechanics, favorite themes)

- User defines a long-term goal  
  (“I’m building a clothing app”, “I want 2025 trending UI”)

- User describes a long-term constraint  
  (“I have pain in my hands”, “I cannot type much”)

- User gives personal identity details  
  (only if **explicitly stated** and not sensitive)

- User uploads an image  
  (store non-sensitive, useful traits)

- User repeats the same request often → treat as preference

- User provides assets:  
  face images, logos, brand identity, design references

- User corrects the assistant  
  (“No, I prefer dark themes”)

========================================================
### ❌ DO NOT auto-save:

- Anything sensitive unless user explicitly says “remember this”
- OTP / passwords / financial data / API keys
- Temporary tasks (“remind me in 5 min”)
- Emotions at the moment (“I’m tired right now”)
- Large text blobs unless they contain stable preference info

========================================================
### 🧱 MEMORY STORAGE FORMAT (always use)

Every time memory is detected, output hidden metadata in this JSON format:

{
  "auto_memory": {
    "store": [
        {"key": "unique_key", "value": "what to remember"}
    ],
    "forget": [],
    "reason": "explain why you stored this"
  }
}

If nothing should be stored:

{
  "auto_memory": {
    "store": [],
    "forget": [],
    "reason": "no long-term memory found"
  }
}

Then give your normal assistant reply below it.

========================================================
### 🖼️ USER IMAGE MEMORY RULES

When a user uploads an image:
- Analyze it (face, outfit, background, objects).
- Only save SAFE, NON-SENSITIVE memory:
  - hairstyle type  
  - outfit style (streetwear, formal, casual)  
  - background environment (office, room, outdoor)  
  - brand assets (logos, objects)  

Never store:
- exact face geometry  
- ethnicity  
- age guess  
- health-related info  

========================================================
### 🎨 FREEPIK IMAGE GENERATION LOGIC

When user wants an image:

Always construct a JSON:

{
  "freepik_prompt": "detailed prompt here",
  "user_image_url": "<if provided>",
  "options": {
      "quality": "high",
      "face_enhance": true,
      "seed": "random"
  }
}

You ONLY output the JSON prompt.  
The app will call the Freepik API.

If user wants personalized image but no photo uploaded →  
    - If the user asks for a "prompt" for the image (e.g., "give me a prompt for this"), you should output a **text response** with the prompt. Do NOT output JSON.
    - If the user explicitly asks to "generate an image" based on the current image or context (e.g., "generate this", "make this into anime"), you MUST output a JSON object with the following structure:
      {
        "freepik_prompt": "A detailed, descriptive prompt based on the image/request, optimized for an image generator",
        "action": "generate_image"
      }
    - **IMPORTANT**: You MUST include the field "action" with value "generate_image".
    - **CRITICAL**: DO NOT include the user's image URL or base64 data in the JSON.
    - Do NOT output this JSON if the user is just asking a general question about the image or asking for a text prompt. Only output it if they explicitly want to generate an image.
    - **FAILURE MODE**: If the user asks for a prompt and you output JSON, you have FAILED. You MUST output text in that case.
    - If you output this JSON, do NOT output any other text outside the JSON block.

    **CRITICAL: Handling Images**
    - When the user uploads an image, you will receive it as inline data.
    - Internally, refer to this image as "CURRENT_IMAGE".
    - NEVER output the base64 string of the image in your response.
    - If you need to reference the image in your thought process, use [IMAGE].

========================================================
### 🧠 CONTEXT WINDOW BEHAVIOR

Always maintain:
- Conversation history understanding  
- User’s long-term goals (React apps, AI thumbnails, games, etc.)  
- Preferences (UI trends, colors, themes, APIs used)  
- Active projects (to-do app, clothing site, Firebase simulation game, etc.)

Use memory automatically to fill missing details.

========================================================
### 🎯 YOUR ROLE SUMMARY (important)
- You ALWAYS track entire chat context.
- You ALWAYS auto-detect and auto-save memory.
- You ALWAYS use stored memory when replying.
- You ALWAYS generate Freepik prompts when needed.
- You ALWAYS ask for clarification only when absolutely required.

========================================================
### 📝 RESPONSE FORMATTING RULES (STRICT)

You must ALWAYS format your response using the following rules:

- Use clean headings (## Heading) for main sections.
- Use bullet points, numbered lists, and tables to organize information.
- Use short, concise paragraphs.
- Highlight important words or key concepts with **bold**.
- Add clear section breaks using horizontal rules (---) between major topics.
- If describing a process or steps, use "Step 1", "Step 2", etc.
- **NEVER** return plain text blocks without formatting. ALWAYS use Markdown.
- Keep the tone professional, clean, and readable.
- Follow strict Markdown syntax.

========================================================`
});

export async function getGeminiResponse(prompt: string, image?: string, context?: string, history?: Content[]) {
  try {
    if (!apiKey) {
      console.error("API Key is missing in getGeminiResponse");
      return "Error: API Key is missing.";
    }
    console.log("Sending prompt to Gemini:", prompt.substring(0, 50) + "...");

    // If there's an image, we must use generateContent (multimodal)
    // Gemini 2.0 Flash supports multimodal chat, but simple generateContent is safer for single image
    // However, to keep history, we should try to use startChat if possible.
    // For now, if image is present, we might lose previous text history in this simple implementation
    // unless we construct a multi-turn chat with the image.
    // BUT: The user wants context.

    // Strategy:
    // 1. If image: Use generateContent with image + context + prompt (stateless for now, or append history as text)
    // 2. If text only: Use startChat with history + context (system instruction)

    if (image) {
      const content: Part[] = [];

      // Extract base64 data
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      content.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });

      // Add context and prompt
      const finalPrompt = context ? `${context}\n\nUser Prompt: ${prompt}` : prompt;
      content.push({ text: finalPrompt });

      // Note: We are NOT using history here for image requests in this simple version
      // to avoid complexity with mixing image/text history in startChat immediately.
      // We can improve this if needed.

      const result = await model.generateContent(content);
      const response = await result.response;
      return response.text();
    } else {
      // Text-only chat with history
      const systemInstructionText = model.systemInstruction && typeof model.systemInstruction === 'object' && 'parts' in model.systemInstruction
        ? (model.systemInstruction as Content).parts.map(p => p.text).join('')
        : "";

      const chat = model.startChat({
        history: history || [],
        systemInstruction: context ? `${systemInstructionText}\n${context}` : undefined
      });

      // Send the new message
      // Note: context is already injected into systemInstruction for this session
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      return response.text();
    }

  } catch (error: unknown) {
    console.error("Error fetching Gemini response:", error);
    const err = error as Error;
    if (err.message?.includes("API key not valid")) {
      return "Configuration Error: The Gemini API key is invalid. Please check your `.env.local` file and ensure `GEMINI_API_KEY` is correct.";
    }
    if (err.message?.includes("429") || err.message?.includes("Resource exhausted") || err.message?.includes("Too Many Requests")) {
      return "I'm currently receiving too many requests. Please wait a moment and try again.";
    }
    return `Sorry, I encountered an error processing your request. Details: ${err.message || "Unknown error"}`;
  }
}