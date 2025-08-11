'use client';

import { useEffect, useState } from 'react';
import { subscribeToToasts } from '@/lib/ui';

export function Toast() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return subscribeToToasts(setItems);
  }, []);

  if (!items.length) return null;

  return (
    <div className="fixed bottom-4 right-4 space-y-3 z-50">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-3 shadow-lg bg-[var(--card)] border ${
            t.type === 'error'
              ? 'border-red-500/80 text-red-200'
              : t.type === 'success'
              ? 'border-green-500/80 text-green-200'
              : 'border-[var(--accent)] text-[var(--accent)]'
          }`}
        >
          <p className="text-sm font-medium">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
