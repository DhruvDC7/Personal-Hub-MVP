'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';

export default function AccountForm({ initialData = {}, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    type: initialData.type || 'bank',
    balance: initialData.balance,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Debug: Log initial props and state
  useEffect(() => {
    console.log('AccountForm mounted with initialData:', initialData);
    console.log('Initial formData:', formData);
    
    return () => {
      console.log('AccountForm unmounting');
    };
  }, [initialData, formData]);
  
  // Debug: Log form data changes
  useEffect(() => {
    console.log('formData updated:', formData);
  }, [formData]);

  const accountTypes = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'wallet', label: 'Cash/Wallet' },
    { value: 'investment', label: 'Investment' },
    { value: 'loan', label: 'Loan' },
    { value: 'other', label: 'Enter Account Type' },
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
      const method = initialData.id ? 'PUT' : 'POST';
      const payload = initialData.id ? { id: initialData.id, ...formData } : formData;

      await api('/api/accounts', {
        method,
        body: payload,
      });

      showToast({
        type: 'success',
        message: `Account ${initialData.id ? 'updated' : 'created'} successfully`,
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
        <label htmlFor="name" className="block text-sm font-medium text-slate-300">
          Account Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Please enter account name"
          className="mt-1 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 shadow-sm focus:border-sky-400 sm:text-base"
          required
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-slate-300">
          Account Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          placeholder="Please enter account type"
          className="mt-1 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 py-2 pl-3 pr-10 text-base focus:border-sky-400 sm:text-base"
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
        <label htmlFor="balance" className="block text-sm font-medium text-slate-300">
          Current Balance
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-slate-300 sm:text-sm">₹</span>
          </div>
          <input
            type="number"
            step="0.01"
            id="balance"
            name="balance"
            value={formData.balance}
            onChange={handleChange}
            placeholder="Please enter account balance"
              className="pl-7 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 shadow-sm focus:border-sky-400 sm:text-base"
            required
          />
        </div>
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
          {isSubmitting ? 'Saving...' : 'Save Account'}
        </button>
      </div>
    </form>
  );
}
