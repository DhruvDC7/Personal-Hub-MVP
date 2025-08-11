'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';
import { Button } from '@/components/ui/Button';

export default function TransactionForm({ initialData = {}, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    account_id: initialData.account_id || initialData.account?._id || '',
    type: initialData.type || 'expense',
    amount: initialData.amount || '',
    category: initialData.category || '',
    note: initialData.note || '',
  });
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const router = useRouter();

  const transactionTypes = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer' },
  ];

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

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await api('/api/accounts');
        setAccounts(data);

        // If no account is selected, select the first one by default
        if (!formData.account_id && data.length > 0) {
          setFormData(prev => ({ ...prev, account_id: data[0]._id }));
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleAiParse = async () => {
    if (!aiNote.trim()) {
      showToast({ type: 'error', message: 'Please enter a note to parse with AI.' });
      return;
    }
    setIsParsing(true);
    try {
      const parsedData = await api('/api/transactions/parse-with-ai', {
        method: 'POST',
        body: { note: aiNote },
      });

      setFormData(prev => ({
        ...prev,
        amount: parsedData.amount || prev.amount,
        type: parsedData.type || prev.type,
        category: parsedData.category || prev.category,
        note: aiNote, // Store the original prompt in the notes
      }));

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
      // Ensure account_id is properly set from the selected account
      const selectedAccount = accounts.find(acc => acc._id === formData.account_id);
      if (!selectedAccount) {
        throw new Error('Please select a valid account');
      }

      const payload = {
        ...formData,
        account_id: selectedAccount._id, // Ensure we're using the _id from the account object
        amount: Number(formData.amount),
      };

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
        <label htmlFor="ai-note" className="block text-sm font-medium text-[var(--muted)] mb-1">
          Describe your transaction with AI
        </label>
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)] shadow-sm">
          <textarea
            id="ai-note"
            name="ai-note"
            rows={2}
            value={aiNote}
            onChange={(e) => setAiNote(e.target.value)}
            className="flex-1 block w-full bg-[var(--input)] text-[var(--foreground)] placeholder-[var(--muted)] border-0 focus:ring-1 focus:ring-[var(--accent)] sm:text-sm p-3"
            placeholder="e.g., paid 500 for rent"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAiParse())}
          />
          <Button
            type="button"
            onClick={handleAiParse}
            isLoading={isParsing}
            className="rounded-none"
          >
            {isParsing ? 'Parsing...' : 'Fill with AI'}
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
          className="mt-1 block w-full rounded-lg bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
          required
        >
          {transactionTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="account_id" className="block text-sm font-medium text-[var(--muted)] mb-1">
          Account
        </label>
        <select
          id="account_id"
          name="account_id"
          value={formData.account_id}
          onChange={handleChange}
          className="mt-1 block w-full rounded-lg bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
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
        <label htmlFor="amount" className="block text-sm font-medium text-[var(--muted)] mb-1">
          Amount
        </label>
        <div className="relative rounded-lg overflow-hidden">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-[var(--muted)] text-sm font-medium">
              {formData.type === 'expense' ? '-' : '+'} ₹
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
            className="block w-full bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm rounded-lg transition-colors"
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
          value={formData.category}
          onChange={handleChange}
          className="mt-1 block w-full rounded-lg bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
          required
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
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
          className="mt-1 block w-full rounded-lg bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
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
        >
          {isSubmitting ? 'Saving...' : 'Save Transaction'}
        </Button>
      </div>
    </form>
      )}
    </>
  );
}
