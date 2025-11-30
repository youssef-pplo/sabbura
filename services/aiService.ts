import Tesseract from 'tesseract.js';
import { DEEPSEEK_API_KEY } from '../constants';

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

/**
 * Helper function to call DeepSeek API
 */
const callDeepSeek = async (systemPrompt: string, userPrompt: string) => {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false
      })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error("DeepSeek Call Failed:", error);
    return null;
  }
};

export const generateBrainstormIdeas = async (topic: string): Promise<{ title: string; description: string }[]> => {
  const systemPrompt = `You are a creative brainstorming assistant. 
  Generate 6 distinct, creative, and short ideas. 
  Output strictly valid JSON in the following format:
  {
    "ideas": [
      { "title": "Idea Title", "description": "Short description" }
    ]
  }
  Do not include markdown formatting like \`\`\`json.`;

  const content = await callDeepSeek(systemPrompt, `Topic: "${topic}"`);
  
  if (!content) return [];

  try {
    // Clean up potential markdown formatting from the response
    const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const json = JSON.parse(jsonString);
    return json.ideas || [];
  } catch (error) {
    console.error("Failed to parse DeepSeek response:", error);
    return [];
  }
};

/**
 * Uses Tesseract.js to extract text from an image (OCR).
 * Since DeepSeek is text-only, we need client-side OCR first.
 */
export const recognizeImageContent = async (imageBase64: string): Promise<string | null> => {
  try {
    const result = await Tesseract.recognize(
      imageBase64,
      'eng'
    );
    return result.data.text.trim();
  } catch (error) {
    console.error("Tesseract OCR Error:", error);
    return null;
  }
};

/**
 * Uses DeepSeek to solve the math problem text
 */
export const solveMathProblem = async (problem: string): Promise<string | null> => {
  if (!problem) return null;
  
  const systemPrompt = "You are a helpful math tutor. Solve the following problem concisely. Show the steps briefly and provide the final answer clearly.";
  
  return await callDeepSeek(systemPrompt, `Problem: ${problem}`);
};