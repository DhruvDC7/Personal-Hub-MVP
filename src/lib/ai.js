// Universal AI helper (Google Gemini)
// - aiJSONPrompt: pass a single prompt string with all instructions + data and get strict JSON back

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Universal helper to call Google Gemini and return strict JSON.
 * All routes should prefer using this.
 */
 

/**
 * Simplest universal entrypoint: pass a single prompt string that includes
 * ALL instructions and data. Returns parsed JSON.
 * Example usage (transactions):
 *   const json = await aiJSONPrompt(`Parse this note into JSON ...\nNote: ${note}\nCategories: ${JSON.stringify(categories)}\nReturn ONLY JSON with keys ...`)
 * Example usage (report):
 *   const json = await aiJSONPrompt(`You are a financial analyst ...\nData: ${JSON.stringify(data)}\nReturn JSON with keys ...`)
 */
export async function aiJSONPrompt(prompt, modelName = 'gemini-1.5-flash') {
  const googleKey = process.env.GOOGLE_AI_KEY;
  if (!googleKey) throw new Error('GOOGLE_AI_KEY is not set');
  const model = new GoogleGenerativeAI(googleKey).getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: String(prompt || '') }] },
    ],
  });
  const text = result?.response?.text?.() || '';
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
}
 
