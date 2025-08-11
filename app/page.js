'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import AddTransactionButton from '@/components/AddTransactionButton';
import { formatINR } from '@/lib/format';
import Card from '@/components/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import ProtectedRoute from '@/components/ProtectedRoute';

function Dashboard() {
  const [netWorth, setNetWorth] = useState({ networth: 0, currency: 'INR' });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [accountCount, setAccountCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [totals, setTotals] = useState({ spent: 0, earned: 0 });
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch net worth data
      const netWorthResponse = await fetch('/api/metrics/networth');
      if (!netWorthResponse.ok) {
        throw new Error(`HTTP error! status: ${netWorthResponse.status}`);
      }
      const netWorthData = await netWorthResponse.json();
      
      // Fetch recent transactions
      const transactionsResponse = await fetch('/api/transactions?limit=25&sort=created_on');
      if (!transactionsResponse.ok) {
        throw new Error(`HTTP error! status: ${transactionsResponse.status}`);
      }
      const transactionsData = await transactionsResponse.json();
      
      // Fetch accounts data
      const accountsResponse = await fetch('/api/accounts');
      if (!accountsResponse.ok) {
        throw new Error(`HTTP error! status: ${accountsResponse.status}`);
      }
      const accountsData = await accountsResponse.json();
      
      // Fetch documents count
      const documentsResponse = await fetch('/api/documents');
      if (!documentsResponse.ok) {
        throw new Error(`HTTP error! status: ${documentsResponse.status}`);
      }
      const documentsData = await documentsResponse.json();
      
      if (netWorthData.status) {
        setNetWorth(netWorthData.data);
      }
      
      if (accountsData.status) {
        setAccountCount(accountsData.data.length);
      }
      
      if (documentsData.success) {
        setDocumentCount(documentsData.data.length || 0);
      }
      
      const txns = transactionsData.data || [];
      setRecentTransactions(txns);
      // Compute totals for donut: earned vs spent
      let spent = 0;
      let earned = 0;
      for (const t of txns) {
        if (t.type === 'income') {
          earned += Math.abs(Number(t.amount) || 0);
        } else {
          spent += Math.abs(Number(t.amount) || 0);
        }
      }
      setTotals({ spent, earned });
    } catch (error) {
      // You might want to show an error toast here
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  const totalAmount = totals.spent + totals.earned;
  const earnedPct = totalAmount ? Math.round((totals.earned / totalAmount) * 100) : 0;
  const spentPct = 100 - earnedPct;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-100 text-sm">Hello{user?.name ? ',' : ''}</p>
            <h1 className="text-2xl font-bold text-white">{user?.name || 'Welcome back'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <AddTransactionButton onTransactionAdded={loadData} />
          </div>
        </div>
      </div>

      {/* Balance + Donut */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400">Available Balance</p>
              <p className={`mt-2 text-4xl font-semibold ${netWorth.networth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatINR(netWorth.networth)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Accounts</p>
              <p className="text-lg font-medium">{accountCount}</p>
              <p className="text-xs text-slate-400 mt-2">Documents</p>
              <p className="text-lg font-medium">{documentCount}</p>
            </div>
          </div>
          <div className="mt-3">
            <Button as={Link} href="/accounts" variant="link" className="text-sm">
              View all wealth →
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-50">This Period</h3>
          </div>
          <div className="mt-4 flex items-center gap-6">
            {/* Donut */}
            <div className="relative h-28 w-28 shrink-0" aria-label={`Earned ${earnedPct}% Spent ${spentPct}%`}>
              <div
                className="h-full w-full rounded-full"
                style={{
                  background: `conic-gradient(#10b981 0% ${earnedPct}%, #ef4444 ${earnedPct}% 100%)`,
                }}
              />
              <div className="absolute inset-3 rounded-full bg-[var(--card)]" />
            </div>
            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm text-slate-400">Earned</p>
                  <p className="font-medium">{formatINR(totals.earned)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm text-slate-400">Spent</p>
                  <p className="font-medium">{formatINR(totals.spent)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Services */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-50">Services</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/accounts" className="group">
            <div className="rounded-xl bg-slate-800/60 hover:bg-slate-800 transition p-4 text-center">
              <div className="mx-auto h-8 w-8 rounded-lg bg-blue-600/20 text-blue-300 grid place-items-center">🏦</div>
              <div className="mt-2 text-sm">Banks</div>
            </div>
          </Link>
          <Link href="/documents" className="group">
            <div className="rounded-xl bg-slate-800/60 hover:bg-slate-800 transition p-4 text-center">
              <div className="mx-auto h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-300 grid place-items-center">📄</div>
              <div className="mt-2 text-sm">Documents</div>
            </div>
          </Link>
          <Link href="/transactions" className="group">
            <div className="rounded-xl bg-slate-800/60 hover:bg-slate-800 transition p-4 text-center">
              <div className="mx-auto h-8 w-8 rounded-lg bg-amber-600/20 text-amber-300 grid place-items-center">🧾</div>
              <div className="mt-2 text-sm">Transactions</div>
            </div>
          </Link>
          <Link href="/profile" className="group">
            <div className="rounded-xl bg-slate-800/60 hover:bg-slate-800 transition p-4 text-center">
              <div className="mx-auto h-8 w-8 rounded-lg bg-fuchsia-600/20 text-fuchsia-300 grid place-items-center">👤</div>
              <div className="mt-2 text-sm">Profile</div>
            </div>
          </Link>
        </div>
      </Card>

      {/* Spendings List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-50">Spendings</h2>
          <Button as={Link} href="/transactions" variant="link" className="text-sm">
            View all →
          </Button>
        </div>
        <Card>
          {recentTransactions.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">No recent transactions. Add your first transaction!</div>
          ) : (
            <ul className="divide-y divide-slate-700/60">
              {recentTransactions.slice(0, 7).map((txn) => (
                <li key={txn.id || txn._id || txn.created_on} className="flex items-center gap-3 p-4">
                  <div className={`h-10 w-10 rounded-full grid place-items-center text-sm font-semibold ${txn.type === 'income' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {txn.category?.[0]?.toUpperCase() || '₹'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{txn.note || txn.category || 'Transaction'}</p>
                    <p className="text-xs text-slate-400">{new Date(txn.created_on).toLocaleDateString()}</p>
                  </div>
                  <div className={`text-right shrink-0 ${txn.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {txn.type === 'income' ? '+' : '-'}{formatINR(Math.abs(txn.amount))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
