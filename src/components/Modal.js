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
        className="fixed left-0 right-0 bottom-0 top-16 z-30 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed left-0 right-0 bottom-0 top-16 z-40 flex items-start justify-center p-4 pt-6 md:pt-8 overflow-y-auto"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          className="z-[60] w-full max-w-3xl md:max-w-4xl max-h-[90vh] rounded-2xl bg-[var(--card)]/95 shadow-2xl border border-[var(--border)] text-[var(--foreground)] flex flex-col ring-1 ring-white/10 modal-pop"
        >
          {title && (
            <div className="flex items-center justify-between flex-shrink-0 px-6 pt-5 pb-3 border-b border-[var(--border)]">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h2>
              <button
                aria-label="Close"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
