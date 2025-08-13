"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/Forms/TransactionForm";
import { showToast } from "@/lib/ui";
import { useRouter } from "next/navigation";

export default function AddTransactionButton({ onTransactionAdded, className = "" }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    try {
      const res = await fetch('/api/accounts', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to check accounts');
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      if (list.length === 0) {
        showToast({ type: 'info', message: 'Add an account first to create transactions.' });
        router.push('/accounts');
        return;
      }
      setOpen(true);
    } catch {
      // Fallback: still allow opening, form will fetch accounts and can handle errors
      setOpen(true);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`relative isolate inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-white 
        text-sm px-3 py-2 shadow-xl shadow-red-500/20 ring-1 ring-white/10 backdrop-blur 
        transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-2xl hover:ring-white/20 
        floating-btn ${className}`}
      >
        + Add Transaction
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add New Transaction">
        <TransactionForm
          onSuccess={() => {
            setOpen(false);
            if (onTransactionAdded) {
              onTransactionAdded();
            }
          }}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
