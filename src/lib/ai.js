// Universal AI helper (Google Gemini)
// - aiJSONPrompt: pass a single prompt string with all instructions + data and get strict JSON back

import OpenAI from 'openai';

/**
 * Universal helper to call OpenAI and return strict JSON.
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
export async function aiJSONPrompt(prompt, modelName = 'gpt-4o-mini') {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY is not set');

  const client = new OpenAI({ apiKey: openaiKey });

  const completion = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: 'You are a helpful assistant that ONLY returns valid JSON. Do not include any extra text.' },
      { role: 'user', content: String(prompt || '') },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const text = completion?.choices?.[0]?.message?.content || '';
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
}
 
