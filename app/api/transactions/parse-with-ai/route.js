import { requireAuth } from '@/middleware/auth';
import { CATEGORIES } from '@/constants/categories';
import { aiJSONPrompt } from '@/lib/ai';

export async function POST(req) {
  try {
    const { userId } = requireAuth(req);
    const { note } = await req.json();

    if (!note) {
      return new Response(JSON.stringify({ error: 'Note is required' }), { status: 400 });
    }
    const prompt = `
You are a financial transaction parser. Return ONLY JSON matching this schema:
{
  "amount": number,
  "type": "income" | "expense" | "transfer",
  "category": ${JSON.stringify(CATEGORIES)},
  "from_account": string,
  "to_account": string
}

Rules:
- If transfer between user's accounts, set type="transfer" and category="Transfer"; infer from_account/to_account when possible.
- For EMI/loan payments, set type="expense" and category="EMI Payment". Unless the note explicitly says otherwise, set to_account="Loan". Infer from_account from the note (e.g., specific bank or wallet) or leave a simple generic value like "Bank" if not stated.
- For credit card bill payments (non-EMI), set type="expense" and category="Financial Expenses". to_account should be the specific card account if mentioned, else "Credit Card".
- For salary/income, set type="income" with appropriate category (e.g., "Salary").
- amount must be a number with no symbols or commas.

Examples:
- Note: "pay emi 100"
  -> { "amount": 100, "type": "expense", "category": "EMI Payment", "from_account": "Bank", "to_account": "Loan" }
- Note: "Paid HDFC loan emi 2500 from SBI"
  -> { "amount": 2500, "type": "expense", "category": "EMI Payment", "from_account": "SBI", "to_account": "HDFC Loan" }
- Note: "Credit card bill 1200"
  -> { "amount": 1200, "type": "expense", "category": "Financial Expenses", "from_account": "Bank", "to_account": "Credit Card" }

Data:
Note: ${note}
Categories: ${JSON.stringify(CATEGORIES)}
UserContext: ${JSON.stringify({ userId })}
`;

    const data = await aiJSONPrompt(prompt);

    // Post-processing safeguards for EMI defaults
    const lowerNote = String(note || '').toLowerCase();
    const isEMINote = /\bemi\b|\bloan\b/.test(lowerNote);
    const out = { ...(data || {}) };

    if (isEMINote && out?.category === 'EMI Payment') {
      // ensure type and to_account defaults
      out.type = 'expense';
      if (!out.to_account || /^(bank|cash|wallet)$/i.test(String(out.to_account))) {
        out.to_account = 'Loan';
      }
    }

    // Normalize amount to number if it's a numeric string
    if (out.amount != null && typeof out.amount !== 'number') {
      const n = Number(String(out.amount).replace(/[\,\s]/g, ''));
      if (!Number.isNaN(n)) out.amount = n;
    }

    return new Response(JSON.stringify(out), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to parse transaction with AI.' }), { status: 500 });
  }
}
