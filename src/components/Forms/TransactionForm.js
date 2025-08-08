'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';
import { formatDateShort } from '@/lib/format';

export default function TransactionForm({ initialData = {}, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    account: initialData.account || '',
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
  }, []);

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
      const url = initialData._id
        ? `/api/transactions/${initialData._id}`
        : '/api/transactions';

      const method = initialData._id ? 'PUT' : 'POST';

      await api(url, {
        method,
        body: {
          ...formData,
          amount: parseFloat(formData.amount),
        },
      });

      showToast({
        type: 'success',
        message: `Transaction ${initialData._id ? 'updated' : 'added'} successfully`,
      });
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving transaction:', error);
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
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Transaction Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
        <label htmlFor="account" className="block text-sm font-medium text-gray-700">
          Account
        </label>
        <select
          id="account"
          name="account"
          value={formData.account}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">
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
            className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
        <label htmlFor="happened_on" className="block text-sm font-medium text-gray-700">
          Date & Time
        </label>
        <input
          type="datetime-local"
          id="happened_on"
          name="happened_on"
          value={formData.happened_on}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium text-gray-700">
          Note (Optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          value={formData.note}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Transaction'}
        </button>
      </div>
    </form>
  );
}
