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
        className="rounded-lg px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white"
      >
        Add Transaction
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
