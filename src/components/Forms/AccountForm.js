'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';
import { Button } from '@/components/ui/Button';
import { ACCOUNT_TYPE_OPTIONS, ACCOUNT_TYPES } from '@/constants/types';

export default function AccountForm({ initialData = {}, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    type: initialData.type || ACCOUNT_TYPES.BANK,
    balance: initialData.balance ?? '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // No debug logs needed in production

  const accountTypes = ACCOUNT_TYPE_OPTIONS;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    // Let users clear the balance field (avoid coercing to 0 while typing)
    if (name === 'balance') {
      setFormData(prev => ({
        ...prev,
        balance: value, // keep as string; convert on submit
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const existingId = initialData.id || initialData._id;
      const method = existingId ? 'PUT' : 'POST';
      // Validate and round balance just before submit
      const parseAndRound = (val) => {
        if (val === '' || val === null || val === undefined) return 0; // empty treated as 0 for initial balance
        const n = Number(val);
        if (!Number.isFinite(n)) throw new Error('Please enter a valid numeric balance');
        return Math.round(n * 100) / 100;
      };
      const roundedBalance = parseAndRound(formData.balance);
      const normalized = {
        ...formData,
        balance: roundedBalance,
      };
      const payload = existingId ? { id: existingId, ...normalized } : normalized;

      const result = await api('/api/accounts', {
        method,
        body: payload,
      });

      showToast({
        type: 'success',
        message: `Account ${existingId ? 'updated' : 'created'} successfully`,
      });
      router.refresh();
      if (onSuccess) onSuccess(result);
    } catch (error) {
      // Error is shown via toast in the API layer
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--muted)] mb-1.5">
          Account Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter account name"
          className="mt-1 block w-full rounded-lg bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
          required
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-[var(--muted)] mb-1.5">
          Account Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full rounded-lg bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] py-2.5 pl-3 pr-10 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
          required
        >
          {accountTypes.map((type) => (
            <option key={type.value} value={type.value} className="bg-[var(--card)]">
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="balance" className="block text-sm font-medium text-[var(--muted)] mb-1.5">
          Initial Balance
        </label>
        <div className="mt-1 relative rounded-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-[var(--muted)] text-sm">₹</span>
          </div>
          <input
            type="number"
            id="balance"
            name="balance"
            value={formData.balance}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            className="pl-8 block w-full rounded-lg bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] py-2.5 pr-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Account'}
        </Button>
      </div>
    </form>
  );
}
