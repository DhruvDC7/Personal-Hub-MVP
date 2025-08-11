'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AddTransactionButton from '@/components/AddTransactionButton';
import { formatINR } from '@/lib/format';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import Table from '@/components/Table';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';

function Dashboard() {
  const [netWorth, setNetWorth] = useState({ networth: 0, currency: 'INR' });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [accountCount, setAccountCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch net worth data
      const netWorthResponse = await fetch('/api/metrics/networth');
      const netWorthData = await netWorthResponse.json();
      
      // Fetch recent transactions
            const transactionsResponse = await fetch('/api/transactions?limit=5&sort=created_on');
      const transactionsData = await transactionsResponse.json();
      
      // Fetch accounts data
      const accountsResponse = await fetch('/api/accounts');
      const accountsData = await accountsResponse.json();
      
      if (netWorthData.status) {
        setNetWorth(netWorthData.data);
      }
      
      if (accountsData.status) {
        setAccountCount(accountsData.data.length);
      }
      
      setRecentTransactions(transactionsData.data || []);
    } catch (error) {
      // Error is handled by the UI state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const transactionColumns = [
        { key: 'date', header: 'Date', render: (txn) => new Date(txn.created_on).toLocaleDateString() },
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
        actions={<AddTransactionButton onTransactionAdded={loadData} />}
      />

      <div className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h3 className="text-lg font-medium text-slate-50">Net Worth</h3>
          <p className={`mt-2 text-3xl font-semibold ${netWorth.networth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatINR(netWorth.networth)}
          </p>
          <Button 
            as={Link} 
            href="/accounts" 
            variant="link" 
            className="mt-2 text-sm"
          >
            View all accounts →
          </Button>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-slate-50">Accounts</h3>
          <p className="mt-2 text-3xl font-semibold">
            {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
          </p>
          <Button 
            as={Link} 
            href="/accounts" 
            variant="link" 
            className="mt-2 text-sm"
          >
            View all accounts →
          </Button>
        </Card>

        <Card>
          <h3 className="text-lg font-medium text-slate-50">Recent Documents</h3>
          <p className="mt-2 text-3xl font-semibold">
            {netWorth.documentCount || 0} documents
          </p>
          <Button 
            as={Link} 
            href="/documents" 
            variant="link" 
            className="mt-2 text-sm"
          >
            View all documents →
          </Button>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-50">Recent Transactions</h2>
          <Button 
            as={Link} 
            href="/transactions" 
            variant="link" 
            className="text-sm"
          >
            View all transactions →
          </Button>
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
