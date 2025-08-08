import { Suspense } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/format';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import Table from '@/components/Table';

async function getNetWorth() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/metrics/networth`, { next: { revalidate: 60 } });
  if (!res.ok) return { netWorth: 0 };
  return res.json();
}

async function getRecentTransactions() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?limit=5`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

async function Dashboard() {
  const [netWorth, recentTransactions] = await Promise.all([
    getNetWorth(),
    getRecentTransactions(),
  ]);

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
        actions={
          <Link 
            href="/transactions/new" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Transaction
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h3 className="text-lg font-medium text-gray-900">Net Worth</h3>
          <p className="mt-2 text-3xl font-semibold">
            {formatINR(netWorth.netWorth)}
          </p>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-gray-900">Accounts</h3>
          <p className="mt-2 text-3xl font-semibold">
            {netWorth.accountCount || 0} accounts
          </p>
          <Link 
            href="/accounts" 
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            View all accounts →
          </Link>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-gray-900">Recent Documents</h3>
          <p className="mt-2 text-3xl font-semibold">
            {netWorth.documentCount || 0} documents
          </p>
          <Link 
            href="/documents" 
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
          >
            View all documents →
          </Link>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
          <Link 
            href="/transactions" 
            className="text-sm text-indigo-600 hover:text-indigo-500"
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
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg mt-8"></div>
      </div>
    }>
      <Dashboard />
    </Suspense>
  );
}
