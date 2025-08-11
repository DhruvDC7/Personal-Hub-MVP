"use client";

import Table from '@/components/Table';
import { formatINR, formatDateShort } from '@/lib/format';

// Table of recent transactions
export default function RecentTable({ transactions }) {
  const columns = [
    { key: 'date', header: 'Date', render: (tx) => formatDateShort(tx.date) },
    { key: 'description', header: 'Description' },
    { key: 'category', header: 'Category' },
    {
      key: 'amount',
      header: 'Amount',
      render: (tx) => (
        <span className={tx.amount < 0 ? 'text-red-500' : 'text-green-500'}>
          {formatINR(tx.amount)}
        </span>
      ),
    },
  ];

  return <Table columns={columns} data={transactions || []} emptyState="No records found" />;
}

