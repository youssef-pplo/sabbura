import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google GenAI client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBrainstormIdeas = async (topic: string): Promise<{ title: string; description: string }[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Brainstorm 6 distinct, creative, and short ideas related to the topic: "${topic}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["title", "description"],
          },
        },
      },
    });

    const jsonStr = response.text || "[]";
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Gemini Brainstorm Error:", error);
    return [
      { title: "Error", description: "Could not generate ideas. Check API Key." }
    ];
  }
};

/**
 * Uses Gemini to extract text from an image (OCR)
 * Replaces Tesseract.js with Gemini Vision capabilities.
 */
export const recognizeImageContent = async (imageBase64: string): Promise<string | null> => {
  try {
    // Remove the data URL prefix (e.g., "data:image/png;base64,") to get just the base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Data,
            },
          },
          {
            text: "Extract all the text from this image. Return only the text content.",
          },
        ],
      },
    });
    
    return response.text?.trim() || null;
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return null;
  }
};

/**
 * Uses Gemini to solve the math problem
 */
export const solveMathProblem = async (problem: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are a helpful math tutor. Solve the following problem concisely. Show the steps briefly and provide the final answer clearly.\n\nProblem: ${problem}`,
    });

    return response.text || null;

  } catch (error) {
    console.error("Gemini Solve Error:", error);
    return "Failed to solve. Please check your API key.";
  }
};
