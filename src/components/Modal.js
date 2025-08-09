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
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
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
          className="z-[60] w-full max-w-2xl rounded-xl bg-slate-800/95 shadow-xl ring-1 ring-slate-700 text-slate-100"
        >
          {title && (
            <div className="px-6 pt-4 pb-2">
              <h2 className="text-lg font-medium text-slate-100">{title}</h2>
            </div>
          )}
          <div className="px-6 pb-6">{children}</div>
        </div>
      </div>
    </>,
    document.body
  );
}
