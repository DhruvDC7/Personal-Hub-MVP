import { requireAuth } from '@/middleware/auth';
import { CATEGORIES, BANK_NAME_KEYWORDS, looksLikeInvestmentName, normalizeAccountDisplayName } from '@/constants/types';
import { aiJSONPrompt } from '@/lib/ai';

export async function POST(req) {
  try {
    const { userId } = requireAuth(req);
    const { note, accounts: providedAccounts = [], category: selectedCategory = '' } = await req.json();

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

 Additional hard constraints:
 - We will provide a list of user Accounts (name, type). You MUST choose from_account and to_account ONLY from these names. Do NOT invent new names.
 - If the note suggests moving money from a bank/cash to an investment (e.g., mentions SIP/stock/mutual fund) and both a bank-type and an investment-type account exist, prefer type="transfer" and category="Transfer" with from_account=the bank name and to_account=the investment account name.
 - If a category is provided by the client, prefer that category if it is consistent with the note and accounts provided. Otherwise, infer.

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
 Accounts: ${JSON.stringify((Array.isArray(providedAccounts) ? providedAccounts : []).map(a => ({ name: String(a?.name || ''), type: String(a?.type || '') })))}
 SelectedCategory: ${String(selectedCategory || '')}
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
    // Prefer explicit bank for FROM account, but do not clobber a valid investment TO account in transfers
    // Example: if note contains a bank keyword, set from_account to that bank when missing/ambiguous.
    try {
      const bankRegex = new RegExp(`\\b(${BANK_NAME_KEYWORDS.join('|')})\\b`, 'i');
      const explicitAccountMatch = lowerNote.match(bankRegex);
      if (explicitAccountMatch) {
        const explicit = normalizeAccountDisplayName(explicitAccountMatch[1]);
        if (!out.from_account || looksLikeInvestmentName(out.from_account)) {
          out.from_account = explicit;
        }
        // Only adjust to_account in NON-transfer scenarios and only if it's missing or generic
        const isGenericTo = /^(bank|cash|wallet)$/i.test(String(out.to_account || ''));
        if (String(out.type).toLowerCase() !== 'transfer' && (isGenericTo || !out.to_account)) {
          out.to_account = explicit;
        }
      }
    } catch (_) {
      // no-op fallback if regex build fails
    }
    return new Response(JSON.stringify(out), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to parse transaction with AI.' }), { status: 500 });
  }
}
