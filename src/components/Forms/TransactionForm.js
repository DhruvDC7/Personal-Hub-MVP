'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';

export default function TransactionForm({ initialData = {}, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    account_id: initialData.account_id || initialData.account || '',
    type: initialData.type || 'expense',
    amount: initialData.amount || '',
    category: initialData.category || '',
    note: initialData.note || '',
    happened_on: initialData.happened_on || new Date().toISOString().slice(0, 16),
  });
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        if (!formData.account && data.length > 0) {
          setFormData(prev => ({ ...prev, account: data[0]._id }));
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [formData.account]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
      };

      if (initialData._id) {
        // Update existing transaction
        await api(`/api/transactions/${initialData._id}`, {
          method: 'PUT',
          body: payload, // Pass payload directly, fetcher will stringify it
        });
        showToast({ type: 'success', message: 'Transaction updated successfully' });
      } else {
        // Create new transaction
        await api('/api/transactions', {
          method: 'POST',
          body: payload, // Pass payload directly, fetcher will stringify it
        });
        showToast({ type: 'success', message: 'Transaction created successfully' });
      }

      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error) {
      console.error('Error saving transaction:', error);
      showToast({
        type: 'error',
        message: error.message || 'Failed to save transaction',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading accounts...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-slate-300">
          Transaction Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 py-2 pl-3 pr-10 text-base focus:border-sky-400 sm:text-sm"
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
        <label htmlFor="account_id" className="block text-sm font-medium text-slate-300">
          Account
        </label>
        <select
          id="account_id"
          name="account_id"
          value={formData.account_id}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 py-2 pl-3 pr-10 text-base focus:border-sky-400 sm:text-sm"
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
        <label htmlFor="amount" className="block text-sm font-medium text-slate-300">
          Amount
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-slate-300 sm:text-sm">
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
            className="pl-12 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 shadow-sm focus:border-sky-400 sm:text-sm"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-slate-300">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 py-2 pl-3 pr-10 text-base focus:border-sky-400 sm:text-sm"
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
        <label htmlFor="happened_on" className="block text-sm font-medium text-slate-300">
          Date & Time
        </label>
        <input
          type="datetime-local"
          id="happened_on"
          name="happened_on"
          value={formData.happened_on}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 shadow-sm focus:border-sky-400 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium text-slate-300">
          Note (Optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          value={formData.note}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 shadow-sm focus:border-sky-400 sm:text-sm"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-lg border border-sky-400 bg-transparent py-2 px-4 text-sm font-medium text-sky-400 shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-lg border border-transparent bg-sky-400 hover:bg-sky-500 py-2 px-4 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Transaction'}
        </button>
      </div>
    </form>
  );
}
