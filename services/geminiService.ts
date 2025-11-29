import { GoogleGenAI, Type } from "@google/genai";
import { DEEPSEEK_API_KEY } from "../constants";

export const generateBrainstormIdeas = async (topic: string): Promise<{ title: string; description: string }[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("No API Key found");
      return [
        { title: "No API Key", description: "Please configure your API key to use AI features." },
      ];
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Brainstorm 6 distinct, creative, and short ideas related to the topic: "${topic}". Return them as a JSON array of objects with 'title' and 'description' keys. Keep descriptions under 15 words.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "description"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];

  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};

/**
 * Uses Gemini Vision to extract text/math from an image
 */
export const recognizeImageContent = async (imageBase64: string): Promise<string | null> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("No Google API Key");

    const ai = new GoogleGenAI({ apiKey });
    
    // Remove header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: cleanBase64 } },
          { text: "Transcribe the math problem or text in this image exactly as it appears. Do not solve it yet. Return only the string." }
        ]
      }
    });

    return response.text || null;
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return null;
  }
};

/**
 * Uses DeepSeek API to solve the math problem
 */
export const solveWithDeepSeek = async (problem: string): Promise<string | null> => {
  try {
    if (!DEEPSEEK_API_KEY) throw new Error("No DeepSeek API Key");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful math tutor. Solve the following problem concisely. Provide the final answer clearly." },
          { role: "user", content: problem }
        ],
        stream: false
      })
    });

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    return null;

  } catch (error) {
    console.error("DeepSeek API Error:", error);
    return null;
  }
};
