import { NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { aiJSONPrompt } from '@/lib/ai';
import { MongoClientFind } from '@/helpers/mongo';
import { BANK_TYPE_SYNONYMS, LOAN_TYPE_SYNONYMS, INVESTMENT_TYPE_SYNONYMS } from '@/constants/types';

function monthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(req) {
  try {
    // Require auth and get user context
    const { userId } = requireAuth(req);

    // Query MongoDB directly for accounts and transactions
    const [accRes, txRes, userRes] = await Promise.all([
      MongoClientFind('accounts', { user_id: userId }, { sort: { created_on: -1 } }),
      MongoClientFind('transactions', { user_id: userId }, { sort: { created_on: -1 }, limit: 1000 }),
      MongoClientFind('users', { _id: userId }, { sort: { created_on: -1 } }),
    ]);

    // Only treat 'mode: error' as failures; empty results are fine
    if (accRes?.mode === 'error') throw new Error(accRes.message || 'accounts query failed');
    if (txRes?.mode === 'error') throw new Error(txRes.message || 'transactions query failed');
    if (userRes?.mode === 'error') throw new Error(userRes.message || 'user query failed');

    const accounts = Array.isArray(accRes?.data) ? accRes.data : [];
    const transactions = (Array.isArray(txRes?.data) ? txRes.data : []).filter(t => t && t.amount != null && t.created_on);
    const user = userRes?.data?.[0];

    // Build an index to resolve account names quickly
    const idOf = (x) => (typeof x === 'string' ? x : (x?._id || x?.$oid || x?.oid || x));
    const accById = new Map(accounts.map(a => [idOf(a._id), a]));

    // Enrich transactions with resolved account names/ids (for report display)
    const enrichedTransactions = transactions.map(t => {
      const base = { ...t };
      const type = String(t.type || '').toLowerCase();
      if (type === 'transfer') {
        const fromId = idOf(t.from_account_id);
        const toId = idOf(t.to_account_id);
        const fromAcc = accById.get(fromId);
        const toAcc = accById.get(toId);
        return {
          ...base,
          from_account_id: fromId,
          to_account_id: toId,
          from_account_name: fromAcc?.name || '',
          to_account_name: toAcc?.name || '',
        };
      }
      const accId = idOf(t.account_id);
      const acc = accById.get(accId);
      return {
        ...base,
        account_id: accId,
        account_name: acc?.name || '',
      };
    });

    // Aggregate balances (bank/loan/investment)
    const loanTypes = LOAN_TYPE_SYNONYMS;
    const bankTypes = BANK_TYPE_SYNONYMS;
    const investmentTypes = INVESTMENT_TYPE_SYNONYMS;
    const totals = { bank: 0, loan: 0, investment: 0 };
    for (const a of accounts) {
      const bal = Number(a?.balance) || 0;
      const type = String(a?.type || '').trim().toLowerCase();
      if (loanTypes.has(type)) totals.loan += Math.abs(bal);
      else if (investmentTypes.has(type)) totals.investment += bal;
      else if (bankTypes.has(type)) totals.bank += bal;
      else totals.bank += bal;
    }

    // Spend and income by category
    const spendByCategory = {};
    const incomeByCategory = {};
    for (const t of transactions) {
      const cat = String(t.category || 'Other');
      const amt = Number(t.amount) || 0;
      const type = String(t.type || (amt >= 0 ? 'income' : 'expense')).toLowerCase();
      if (type === 'expense' || amt < 0) {
        spendByCategory[cat] = (spendByCategory[cat] || 0) + Math.abs(amt);
      } else if (type === 'income' || amt > 0) {
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Math.abs(amt);
      }
    }

    // Monthly trends (last 6 months)
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const monthly = months.reduce((acc, m) => ({ ...acc, [m]: { income: 0, expense: 0 } }), {});
    for (const t of transactions) {
      const key = monthKey(t.created_on);
      if (!monthly[key]) continue;
      const amt = Number(t.amount) || 0;
      const type = String(t.type || (amt >= 0 ? 'income' : 'expense')).toLowerCase();
      if (type === 'income' || amt >= 0) monthly[key].income += Math.abs(amt);
      else monthly[key].expense += Math.abs(amt);
    }

    // Top spending (top 5 expenses)
    const topSpending = transactions
      .filter(t => (Number(t.amount) || 0) < 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 5)
      .map(t => ({ id: t.id || t._id, date: t.created_on, category: t.category || 'Other', note: t.note || '', amount: Math.abs(Number(t.amount) || 0) }));

    // Simple anomalies: expenses > 2x median
    const expenseVals = transactions.filter(t => (Number(t.amount) || 0) < 0).map(t => Math.abs(Number(t.amount) || 0)).sort((a, b) => a - b);
    const median = expenseVals.length ? (expenseVals[Math.floor(expenseVals.length / 2)] + expenseVals[Math.ceil(expenseVals.length / 2) - 1]) / 2 : 0;
    const threshold = median * 2 || 0;
    const anomalies = transactions
      .filter(t => (Number(t.amount) || 0) < 0 && Math.abs(Number(t.amount) || 0) > threshold)
      .slice(0, 5)
      .map(t => ({ date: t.created_on, category: t.category || 'Other', amount: Math.abs(Number(t.amount) || 0), note: t.note || '' }));

    const summary = {
      userId,
      user: user ? {
        id: user.id || user._id || userId,
        name: user.name || user.fullName || user.username || undefined,
        email: user.email || undefined,
        phone: user.phone || user.phoneNumber || undefined,
      } : { id: userId },
      totals,
      netWorth: (totals.bank + totals.investment - totals.loan),
      accountsCount: accounts.length,
      transactionsAnalyzed: transactions.length,
      currency: 'INR',
      generatedAt: new Date().toISOString(),
    };

    // AI insights (with user context) via single prompt
    let ai = { insights: [], opportunities: [], risks: [], nextActions: [] };
    try {
      const prompt = `
You are a financial analyst AI. Return ONLY JSON with these keys:
{
  "insights": string[],
  "opportunities": string[],
  "risks": string[],
  "nextActions": string[]
}

Be concise, specific, and prioritized (3-7 items each). Consider user's context if helpful.

Data:
Summary: ${JSON.stringify(summary)}
SpendByCategory: ${JSON.stringify(spendByCategory)}
IncomeByCategory: ${JSON.stringify(incomeByCategory)}
MonthlyTrends: ${JSON.stringify(monthly)}
TopSpending: ${JSON.stringify(topSpending)}
Anomalies: ${JSON.stringify(anomalies)}
UserContext: ${JSON.stringify({ userId })}
`;
      ai = await aiJSONPrompt(prompt);
      // Coerce/validate AI response to expected shape
      if (typeof ai === 'string') {
        try { ai = JSON.parse(ai); } catch { ai = {}; }
      }
      const ensureArray = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : [];
      ai = {
        insights: ensureArray(ai.insights),
        opportunities: ensureArray(ai.opportunities),
        risks: ensureArray(ai.risks),
        nextActions: ensureArray(ai.nextActions),
      };
    } catch (e) {
      ai = { insights: [], opportunities: [], risks: [], nextActions: [], error: String(e?.message || e) };
    }

    const report = {
      summary,
      spendByCategory,
      incomeByCategory,
      monthlyTrends: monthly,
      topSpending,
      anomalies,
      ai,
      charts: {
        breakdown: totals,
        spendByCategory,
        monthlyTrends: monthly,
      },
      accounts,
      transactions: enrichedTransactions,
      // TODO: Generate a PDF using pdfkit/@react-pdf/renderer/puppeteer
      // TODO: Email PDF to the customer via your email provider
    };

    return NextResponse.json({ success: true, data: report });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
