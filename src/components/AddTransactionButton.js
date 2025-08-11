"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/Forms/TransactionForm";

export default function AddTransactionButton({ onTransactionAdded }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-all hover:shadow-lg hover:shadow-red-500/20"
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
