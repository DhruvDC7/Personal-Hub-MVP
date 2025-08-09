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
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-3 shadow-lg bg-slate-800 border ${
            t.type === 'error'
              ? 'border-red-500 text-red-200'
              : t.type === 'success'
              ? 'border-emerald-500 text-emerald-200'
              : 'border-sky-400 text-sky-200'
          }`}
        >
          <p className="text-sm font-medium">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
