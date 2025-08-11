"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/Forms/TransactionForm";

export default function AddTransactionButton({ onTransactionAdded, className = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
