'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-50 grid place-items-center p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          className="z-[60] w-full max-w-2xl rounded-xl bg-[var(--card)] shadow-xl border border-[var(--border)] text-[var(--foreground)]"
        >
          {title && (
            <div className="px-6 pt-5 pb-3 border-b border-[var(--border)]">
              <h2 className="text-lg font-medium">{title}</h2>
            </div>
          )}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </>,
    document.body
  );
}
