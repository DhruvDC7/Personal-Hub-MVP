'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';

export default function AccountForm({ initialData = {}, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    type: initialData.type || 'bank',
    balance: initialData.balance || 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const accountTypes = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'wallet', label: 'Cash/Wallet' },
    { value: 'investment', label: 'Investment' },
    { value: 'loan', label: 'Loan' },
  ];

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
        ? `/api/accounts/${initialData._id}`
        : '/api/accounts';

      const method = initialData._id ? 'PUT' : 'POST';

      await api(url, {
        method,
        body: formData,
      });

      showToast({
        type: 'success',
        message: `Account ${initialData._id ? 'updated' : 'created'} successfully`,
      });
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Account Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Account Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          required
        >
          {accountTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="balance" className="block text-sm font-medium text-gray-700">
          Current Balance
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">₹</span>
          </div>
          <input
            type="number"
            step="0.01"
            id="balance"
            name="balance"
            value={formData.balance}
            onChange={handleChange}
            className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
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
          {isSubmitting ? 'Saving...' : 'Save Account'}
        </button>
      </div>
    </form>
  );
}
