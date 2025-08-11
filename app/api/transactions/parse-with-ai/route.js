import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '@/middleware/auth';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

const categories = [
  'Food & Drinks',
  'Shopping',
  'Housing',
  'Transportation',
  'Vehicle',
  'Life & Entertainment',
  'Communication',
  'Financial Expenses',
  'Investments',
  'Income',
  'Other',
];

const systemPrompt = `
You are an intelligent financial assistant. Your task is to parse a user's natural language note about a transaction and extract the following details in a structured JSON format:

1.  **amount**: The transaction amount as a number.
2.  **type**: The transaction type, which must be either 'income' or 'expense'.
3.  **category**: The transaction category. It must be one of the following values: [${categories.join(', ')}].

Here is the JSON schema you must follow:
{
  "type": "object",
  "properties": {
    "amount": { "type": "number" },
    "type": { "type": "string", "enum": ["income", "expense"] },
    "category": { "type": "string", "enum": [${categories.map(c => `"${c}"`).join(', ')}] }
  },
  "required": ["amount", "type", "category"]
}

Analyze the user's note and return only the JSON object.
`;

export async function POST(req) {
  try {
    requireAuth(req);
    const { note } = await req.json();

    if (!note) {
      return new Response(JSON.stringify({ error: 'Note is required' }), { status: 400 });
    }

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
      ],
    });

    const result = await chat.sendMessage(note);
    
    const response = result.response;
    const parsedText = response.text();
    
    const data = JSON.parse(parsedText);

    return new Response(JSON.stringify(data), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to parse transaction with AI.' }), { status: 500 });
  }
}
