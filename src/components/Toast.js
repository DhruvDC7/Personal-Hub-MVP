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
          className={`rounded-lg px-4 py-3 shadow-lg ${
            t.type === 'error' 
              ? 'bg-red-100 text-red-800 border border-red-200' 
              : t.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          <p className="text-sm font-medium">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
