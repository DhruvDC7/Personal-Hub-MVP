'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AddTransactionButton from '@/components/AddTransactionButton';
import { formatINR } from '@/lib/format';
import { api } from '@/lib/fetcher';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import Table from '@/components/Table';

async function fetchDashboardData() {
  try {
    const [netWorth, recentTransactions] = await Promise.all([
      api('/api/metrics/networth').catch(() => ({ netWorth: 0 })),
      api('/api/transactions?limit=5').catch(() => [])
    ]);
    return { netWorth, recentTransactions };
  } catch (error) {
    // Return default values on error
    return { netWorth: { netWorth: 0 }, recentTransactions: [] };
  }
}

function Dashboard() {
  const [netWorth, setNetWorth] = useState({ netWorth: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDashboardData();
        setNetWorth(data.netWorth || { netWorth: 0 });
        setRecentTransactions(data.recentTransactions || []);
      } catch (error) {
        // Error is handled by the UI state
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  const transactionColumns = [
    { key: 'date', header: 'Date', render: (txn) => new Date(txn.happened_on).toLocaleDateString() },
    { key: 'description', header: 'Description', render: (txn) => txn.note || txn.category },
    { 
      key: 'amount', 
      header: 'Amount', 
      render: (txn) => (
        <span className={txn.type === 'income' ? 'text-green-600' : 'text-red-600'}>
          {formatINR(txn.amount)}
        </span>
      ) 
    },
  ];

  return (
    <div>
      <PageHeader 
        title="Dashboard"
        actions={<AddTransactionButton />}
      />

      <div className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h3 className="text-lg font-medium text-slate-50">Net Worth</h3>
          <p className="mt-2 text-3xl font-semibold">
            {formatINR(netWorth.netWorth)}
          </p>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-slate-50">Accounts</h3>
          <p className="mt-2 text-3xl font-semibold">
            {netWorth.accountCount || 0} accounts
          </p>
          <Link 
            href="/accounts" 
            className="mt-2 text-sm text-sky-400 hover:text-sky-500"
          >
            View all accounts →
          </Link>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-slate-50">Recent Documents</h3>
          <p className="mt-2 text-3xl font-semibold">
            {netWorth.documentCount || 0} documents
          </p>
          <Link 
            href="/documents" 
            className="mt-2 text-sm text-sky-400 hover:text-sky-500"
          >
            View all documents →
          </Link>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-50">Recent Transactions</h2>
          <Link 
            href="/transactions" 
            className="text-sm text-sky-400 hover:text-sky-500"
          >
            View all transactions →
          </Link>
        </div>
        
        <Card>
          <Table 
            columns={transactionColumns} 
            data={recentTransactions} 
            emptyState="No recent transactions. Add your first transaction!"
          />
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
  return <Dashboard />;
}
