import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '@/middleware/auth';
import { CATEGORIES } from '@/constants/categories';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

const categories = CATEGORIES;

const systemPrompt = `
You are an intelligent financial assistant. Your task is to parse a user's natural language note about a transaction and extract the following details in a structured JSON format.

Output a JSON object that follows this schema:
{
  "type": "object",
  "properties": {
    "amount": { "type": "number" },
    "type": { "type": "string", "enum": ["income", "expense", "transfer"] },
    "category": { "type": "string", "enum": [${categories.map(c => `"${c}"`).join(', ')}] },
    "from_account": { "type": "string" },
    "to_account": { "type": "string" }
  },
  "required": ["amount", "type", "category"]
}

Strict rules and mappings:
- If the note indicates a transfer between two of the user's accounts (e.g., "transfer 500 from savings to checking", "moved 2,000 to FD", "sent from wallet to bank"), then:
  - Set "type" to "transfer".
  - Set "category" to "Transfer" (even if not in the natural note).
  - If possible, infer human-readable "from_account" and "to_account" names from the note; otherwise omit them.

- If the note indicates a loan EMI payment, loan repayment, mortgage payment, credit card bill payment, or similar debt servicing (e.g., "paid EMI 12,000 for home loan", "credit card bill 5,500"), then:
  - Set "type" to "expense".
  - Set "category" to "EMI Payment" when it is a loan/EMI; for credit card bill, prefer "Financial Expenses" if EMI Payment is not applicable.

- If the note indicates salary or income (e.g., "salary credited", "received 10,000 from freelance"), set "type" to "income" and choose the best category (e.g., "Salary" for salary).

- Always set "amount" as a number (no currency symbols or commas).

Return only the JSON object, without any additional text.
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
