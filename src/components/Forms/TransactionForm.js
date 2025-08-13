'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/fetcher';
import { CATEGORIES } from '@/constants/types';
import { showToast } from '@/lib/ui';
import { Button } from '@/components/ui/Button';
import {
  TRANSACTION_TYPE_OPTIONS,
  TRANSACTION_TYPES,
  CATEGORY_TRANSFER,
  CATEGORY_EMI,
  typePriority,
} from '@/constants/types';

export default function TransactionForm({ initialData = {}, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    account_id: initialData.account_id || initialData.account?._id || '',
    from_account_id: initialData.from_account_id || '',
    to_account_id: initialData.to_account_id || '',
    type: initialData.type || TRANSACTION_TYPES.EXPENSE,
    amount: initialData.amount || '',
    category: initialData.category || '',
    note: initialData.note || '',
  });
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(true);
  const router = useRouter();

  // helpers
  const norm = (s) => (s || '').toString().trim().toLowerCase();
  // typePriority imported from constants
  const findAccountByName = (name, list) => {
    const arr = Array.isArray(list) ? list : accounts;
    const query = norm(name);
    if (!query) return null;

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Exact match first (prefer non-investment types)
    let exactMatches = arr.filter(a => norm(a.name) === query);
    if (exactMatches.length) {
      exactMatches.sort((a, b) => typePriority(b.type) - typePriority(a.type));
      return exactMatches[0];
    }

    // Word-boundary match (e.g., 'sbi' should not match 'sip stock')
    const wb = new RegExp(`(^|\\b|\\s)${escapeRegex(query)}(\\b|\\s|$)`, 'i');
    let wbMatches = arr.filter(a => wb.test(String(a?.name || '')));
    if (wbMatches.length) {
      wbMatches.sort((a, b) => typePriority(b.type) - typePriority(a.type));
      return wbMatches[0];
    }

    // Token overlap match (at least one full token equal)
    const qTokens = query.split(/[^a-z0-9]+/).filter(Boolean);
    const scored = arr
      .map(a => {
        const t = norm(a.name).split(/[^a-z0-9]+/).filter(Boolean);
        const overlap = qTokens.filter(qt => t.includes(qt));
        return { a, score: overlap.length, pr: typePriority(a.type) };
      })
      .filter(x => x.score > 0)
      .sort((x, y) => (y.score - x.score) || (y.pr - x.pr));
    if (scored.length) return scored[0].a;

    // Fallback to substring includes
    const inc = arr.filter(a => norm(a.name).includes(query));
    if (inc.length) {
      inc.sort((a, b) => typePriority(b.type) - typePriority(a.type));
      return inc[0];
    }
    return null;
  };
  const findLoanAccount = (list) => {
    const arr = Array.isArray(list) ? list : accounts;
    // prefer names that include 'loan' first
    return (
      arr.find(a => /\bloan\b/.test(norm(a?.name))) ||
      arr.find(a => norm(a?.name).includes('loan')) ||
      null
    );
  };

  // Ensure inputs behave nicely on focus on mobile/desktop
  const handleInputFocus = (e) => {
    try {
      // Select text for quick overwrite on focus
      if (e?.target?.select) {
        e.target.select();
      }
    } catch (_) {
      // no-op
    }
  };

  const transactionTypes = TRANSACTION_TYPE_OPTIONS;

  const categories = CATEGORIES;

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await api('/api/accounts');
        setAccounts(data);

        // If no account is selected, select the first one by default (or Loan for EMI)
        if (!formData.account_id && data.length > 0) {
          const loanAcc = formData.category === 'EMI Payment' ? findLoanAccount(data) : null;
          setFormData(prev => ({ ...prev, account_id: (loanAcc?._id || data[0]._id) }));
        }

        // If EMI category is selected but a non-loan account is chosen, try switch to a loan account
        if (formData.category === CATEGORY_EMI && formData.type !== TRANSACTION_TYPES.TRANSFER) {
          const current = data.find(a => a._id === formData.account_id);
          if (!current || !/\bloan\b/i.test(String(current?.name))) {
            const loanAcc = findLoanAccount(data);
            if (loanAcc) {
              setFormData(prev => ({ ...prev, account_id: loanAcc._id, type: TRANSACTION_TYPES.EXPENSE }));
            }
          }
        }

        // If transfer type, prefill from/to accounts with sensible defaults
        if (formData.type === TRANSACTION_TYPES.TRANSFER && data.length > 0) {
          const fromDefault = formData.from_account_id || data[0]._id;
          // choose a different account for "to" if possible
          const toDefault = formData.to_account_id || (data.find(a => a._id !== fromDefault)?._id || data[0]._id);
          setFormData(prev => ({
            ...prev,
            from_account_id: fromDefault,
            to_account_id: toDefault,
          }));
        }
      } catch (error) {
        // Error handled by the UI state
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [formData.account_id]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? parseFloat(value) || 0 : value;

    // Special handling when switching transaction type
    if (name === 'type') {
      if (parsedValue === TRANSACTION_TYPES.TRANSFER) {
        // Ensure from/to are prefilled with valid distinct accounts
        const fromDefault = formData.from_account_id || (accounts[0]?._id ?? '');
        const toDefault = formData.to_account_id || (accounts.find(a => a._id !== fromDefault)?._id || fromDefault);
        setFormData(prev => ({
          ...prev,
          type: TRANSACTION_TYPES.TRANSFER,
          from_account_id: fromDefault,
          to_account_id: toDefault,
          // category is controlled later (disabled for transfer)
        }));
        return;
      }
      // switching away from transfer, ensure account_id is set
      const fallbackAccount = formData.account_id || (accounts[0]?._id ?? '');
      setFormData(prev => ({
        ...prev,
        type: parsedValue,
        account_id: fallbackAccount,
      }));
      return;
    }

    // Special handling when picking EMI category: default to Loan account and expense type
    if (name === 'category' && parsedValue === CATEGORY_EMI) {
      const loanAcc = findLoanAccount(accounts);
      setFormData(prev => ({
        ...prev,
        category: CATEGORY_EMI,
        type: TRANSACTION_TYPES.EXPENSE,
        account_id: loanAcc?._id || prev.account_id || (accounts[0]?._id ?? ''),
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const handleAiParse = async () => {
    if (!aiNote.trim()) {
      showToast({ type: 'error', message: 'Please enter a note to parse with AI.' });
      return;
    }
    setIsParsing(true);
    try {
      // Ensure we have accounts available before calling AI, so we can send them for grounding
      const accs = accounts && accounts.length ? accounts : await api('/api/accounts');
      const compactAccounts = (Array.isArray(accs) ? accs : []).map(a => ({ name: String(a?.name || ''), type: String(a?.type || '') }));

      const parsedData = await api('/api/transactions/parse-with-ai', {
        method: 'POST',
        body: { note: aiNote, accounts: compactAccounts, category: formData.category || '' },
      });

      // Normalize and map AI output
      const next = { ...formData };
      // Store the original prompt in the notes
      next.note = aiNote;
      if (typeof parsedData.amount === 'number' && !Number.isNaN(parsedData.amount)) {
        next.amount = parsedData.amount;
      }

      if (parsedData.type === TRANSACTION_TYPES.TRANSFER) {
        next.type = TRANSACTION_TYPES.TRANSFER;
        next.category = CATEGORY_TRANSFER;
        // Attempt to map human-readable names to IDs
        const fromName = norm(parsedData.from_account);
        const toName = norm(parsedData.to_account);
        const fromAcc = findAccountByName(fromName, accs) || accs[0];
        const toAcc = findAccountByName(toName, accs) || accs.find(a => a._id !== (fromAcc?._id)) || accs[0];
        next.from_account_id = fromAcc?._id || '';
        next.to_account_id = toAcc?._id || '';
      } else {
        // income/expense
        if (parsedData.type === TRANSACTION_TYPES.INCOME || parsedData.type === TRANSACTION_TYPES.EXPENSE) {
          next.type = parsedData.type;
        }
        // Keep category if provided and valid; else default
        const validCategories = CATEGORIES;
        const aiCat = parsedData.category;
        next.category = validCategories.includes(aiCat) ? aiCat : (next.category || 'Other');
        // Map AI from_account to a real account for regular expense/income
        if (parsedData.from_account) {
          const fromAcc = findAccountByName(parsedData.from_account, accs);
          if (fromAcc?._id) {
            next.account_id = fromAcc._id;
          }
        }
        if (next.category === CATEGORY_EMI) {
          // Try to detect transfer if both accounts exist: from bank (e.g., SBI) to loan account (e.g., NAVI Loan)
          let fromName = parsedData.from_account;
          let toName = parsedData.to_account || 'loan';

          // Extract lender hint from the original note if available (e.g., 'paid navi emi from sbi 100' => 'navi')
          let lenderHint = '';
          try {
            const raw = String(aiNote || '');
            // capture word(s) before 'emi' as potential lender (limited length to avoid swallowing too much)
            const m = raw.match(/(?:pay|paid|padi)?\s*([a-z0-9 &.-]{2,30})\s*(?:loan\s*)?emi/i);
            if (m && m[1]) lenderHint = m[1].trim();
          } catch {}

          // Prefer matching a loan account that includes the lender hint
          let candidateLoan = null;
          if (lenderHint) {
            candidateLoan = findAccountByName(lenderHint + ' loan', accs) ||
                            findAccountByName(lenderHint, accs) ||
                            accs.find(a => norm(a.name).includes(norm(lenderHint)) && /loan/.test(norm(a.name))) ||
                            null;
          }
          // Fallbacks
          candidateLoan = candidateLoan || findAccountByName(toName, accs) || findLoanAccount(accs);
          let candidateFrom = findAccountByName(fromName, accs);

          // If from account is still missing, try to extract it from the note: "from <bank>"
          if (!candidateFrom) {
            try {
              const raw = String(aiNote || '');
              const mFrom = raw.match(/from\s+([a-z0-9 &.-]{2,40})/i);
              if (mFrom && mFrom[1]) {
                const hint = mFrom[1].trim();
                candidateFrom = findAccountByName(hint, accs);
              }
            } catch {}
          }

          if (candidateLoan && candidateFrom && candidateLoan._id !== candidateFrom._id) {
            // Convert to transfer
            next.type = TRANSACTION_TYPES.TRANSFER;
            next.category = CATEGORY_TRANSFER;
            next.from_account_id = candidateFrom._id;
            next.to_account_id = candidateLoan._id;
          } else {
            // Fallback to expense with a Loan account if available
            const loanAcc = candidateLoan || findLoanAccount(accs);
            next.type = TRANSACTION_TYPES.EXPENSE;
            // Prefer the source bank account if available to avoid wrong picks like 'sip stock'
            next.account_id = (candidateFrom?._id) || (loanAcc?._id) || next.account_id || accs[0]?._id || '';
          }
        } else {
          next.account_id = next.account_id || accs[0]?._id || '';
        }
      }

      setFormData(next);

      showToast({ type: 'success', message: 'Form pre-filled with AI!' });
      setIsFormVisible(true);
    } catch (error) { 
      showToast({ type: 'error', message: error.message || 'Failed to parse with AI' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let payload;

      if (formData.type === TRANSACTION_TYPES.TRANSFER) {
        const fromAcc = accounts.find(acc => acc._id === formData.from_account_id);
        const toAcc = accounts.find(acc => acc._id === formData.to_account_id);
        if (!fromAcc || !toAcc) throw new Error('Please select valid From and To accounts');
        if (fromAcc._id === toAcc._id) throw new Error('From and To accounts must be different');
        payload = {
          type: TRANSACTION_TYPES.TRANSFER,
          from_account_id: fromAcc._id,
          to_account_id: toAcc._id,
          amount: Number(formData.amount),
          category: CATEGORY_TRANSFER,
          note: formData.note || '',
        };
      } else {
        // Ensure account_id is properly set from the selected account
        const selectedAccount = accounts.find(acc => acc._id === formData.account_id);
        if (!selectedAccount) {
          throw new Error('Please select a valid account');
        }
        // Build minimal payload for expense/income to avoid forbidden empty fields
        payload = {
          type: formData.type,
          account_id: selectedAccount._id,
          amount: Number(formData.amount),
          category: formData.category,
          note: formData.note || '',
        };
      }

      if (initialData.id) {
        // Update existing transaction
        await api('/api/transactions', {
          method: 'PUT',
          body: { id: initialData.id, ...payload },
        });
        showToast({ type: 'success', message: 'Transaction updated successfully' });
      } else {
        // Create new transaction
        await api('/api/transactions', {
          method: 'POST',
          body: payload,
        });
        showToast({ type: 'success', message: 'Transaction created successfully' });
      }

      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error) {
      showToast({
        type: 'error',
        message: error.message || 'Failed to save transaction',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mb-3"></div>
        <p className="text-[var(--muted)]">Loading accounts...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <label htmlFor="ai-note" className="block text-sm font-medium text-[var(--muted)] mb-2 text-center">
          Describe your transaction with AI
        </label>
        <div className="relative flex items-center rounded-full overflow-hidden border border-red-500/30 bg-[var(--input)]/60 ring-1 ring-red-400/20 shadow-[0_0_38px_rgba(239,68,68,0.18)] w-full max-w-xl md:max-w-2xl mx-auto transition-shadow focus-within:ring-2 focus-within:ring-red-500/60 focus-within:border-red-500/60 focus-within:shadow-[0_0_48px_rgba(239,68,68,0.35)]">
          <span className="hidden sm:grid place-items-center pl-5 pr-2 text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-3.5-3.5"/></svg>
          </span>
          <textarea
            id="ai-note"
            name="ai-note"
            rows={2}
            value={aiNote}
            onChange={(e) => setAiNote(e.target.value)}
            className="flex-1 block w-full bg-transparent text-[var(--foreground)] placeholder-white/70 border-0 focus:ring-0 focus:outline-none outline-none text-[15px] md:text-base leading-6 py-3.5 px-4 sm:pl-2 min-h-[56px]"
            placeholder="e.g., paid 500 for rent"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAiParse())}
          />
          <Button
            type="button"
            onClick={handleAiParse}
            isLoading={isParsing}
            aria-label="Fill with AI"
            className="rounded-full m-1 ml-0 h-10 w-10 sm:h-11 sm:w-11 grid place-items-center bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg hover:shadow-red-500/30"
          >
            {isParsing ? (
              '...'
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            )}
          </Button>
        </div>
      </div>
      {isFormVisible && (
        <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-[var(--muted)] mb-1">
          Transaction Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-lg bg-[var(--input)]/60 text-[var(--foreground)] border border-[var(--border)]/80 ring-1 ring-white/10 py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
          required
        >
          {transactionTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {formData.type === 'transfer' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="from_account_id" className="block text-sm font-medium text-[var(--muted)] mb-1">
              From Account
            </label>
            <select
              id="from_account_id"
              name="from_account_id"
              value={formData.from_account_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg bg-[var(--input)]/60 text-[var(--foreground)] border border-[var(--border)]/80 ring-1 ring-white/10 py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
              required
            >
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="to_account_id" className="block text-sm font-medium text-[var(--muted)] mb-1">
              To Account
            </label>
            <select
              id="to_account_id"
              name="to_account_id"
              value={formData.to_account_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg bg-[var(--input)]/60 text-[var(--foreground)] border border-[var(--border)]/80 ring-1 ring-white/10 py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
              required
            >
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="account_id" className="block text-sm font-medium text-[var(--muted)] mb-1">
            Account
          </label>
          <select
            id="account_id"
            name="account_id"
            value={formData.account_id}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg bg-[var(--input)]/60 text-[var(--foreground)] border border-[var(--border)]/80 ring-1 ring-white/10 py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
            required
          >
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-[var(--muted)] mb-1">
          Amount
        </label>
        <div className="relative rounded-lg overflow-hidden">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-[var(--muted)] text-sm font-medium">
              {formData.type === 'expense' ? '-' : formData.type === 'income' ? '+' : ''} ₹
            </span>
          </div>
          <input
            type="number"
            step="0.01"
            min="0.01"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            onFocus={handleInputFocus}
            inputMode="decimal"
            className="block w-full bg-[var(--input)]/60 text-[var(--foreground)] border border-[var(--border)]/80 ring-1 ring-white/10 py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm rounded-lg transition-colors"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-[var(--muted)] mb-1">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.type === 'transfer' ? 'Transfer' : formData.category}
          onChange={handleChange}
          className="mt-1 block w-full rounded-lg bg-[var(--input)]/60 text-[var(--foreground)] border border-[var(--border)]/80 ring-1 ring-white/10 py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
          required={formData.type !== 'transfer'}
          disabled={formData.type === 'transfer'}
        >
          {formData.type !== 'transfer' ? (
            <>
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </>
          ) : (
            <option value="Transfer">Transfer</option>
          )}
        </select>
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium text-[var(--muted)] mb-1">
          Note (Optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          value={formData.note}
          onChange={handleChange}
          onFocus={handleInputFocus}
          className="mt-1 block w-full rounded-lg bg-[var(--input)]/60 text-[var(--foreground)] border border-[var(--border)]/80 ring-1 ring-white/10 py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="shadow-lg hover:shadow-xl"
        >
          {isSubmitting ? 'Saving...' : 'Save Transaction'}
        </Button>
      </div>
    </form>
      )}
    </>
  );
}
