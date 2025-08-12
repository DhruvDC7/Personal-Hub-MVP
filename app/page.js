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
  // Breakdown by account balances
  const [accountBreakdown, setAccountBreakdown] = useState({ bank: 0, loan: 0, investment: 0 });
  const [generatingReport, setGeneratingReport] = useState(false);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch net worth data
      const netWorthResponse = await fetch('/api/metrics/networth', { cache: 'no-store' });
      if (!netWorthResponse.ok) {
        throw new Error(`HTTP error! status: ${netWorthResponse.status}`);
      }
      const netWorthData = await netWorthResponse.json();
      // Set net worth immediately so later failures don't block it
      if (netWorthData.status) {
        setNetWorth(netWorthData.data);
      }
      
      // Fetch accounts data early to compute breakdown
      const accountsResponse = await fetch('/api/accounts', { cache: 'no-store' });
      if (!accountsResponse.ok) {
        throw new Error(`HTTP error! status: ${accountsResponse.status}`);
      }
      const accountsData = await accountsResponse.json();
      if (accountsData.status) {
        setAccountCount(accountsData.data.length);
        // Compute breakdown: bank, loan, investment
        const loanTypes = new Set(['loan', 'liability', 'credit', 'credit card', 'mortgage']);
        const bankTypes = new Set(['bank', 'cash', 'savings', 'current', 'checking']);
        const investmentTypes = new Set([
          'investment',
          'investments',
          'mutual fund',
          'mutual funds',
          'equity',
          'stock',
          'stocks',
          'sip',
          'fd',
          'rd',
          'bond',
          'bonds',
          'crypto',
        ]);
        let bank = 0;
        let loan = 0;
        let investment = 0;
        for (const a of accountsData.data) {
          const balance = Number(a?.balance) || 0;
          const type = String(a?.type || '').trim().toLowerCase();
          if (loanTypes.has(type)) {
            loan += Math.abs(balance);
          } else if (investmentTypes.has(type)) {
            investment += balance;
          } else if (bankTypes.has(type) || type === '' || type === 'asset') {
            bank += balance;
          } else {
            // Fallback: treat unknown as bank-like asset
            bank += balance;
          }
        }
        setAccountBreakdown({ bank, loan, investment });
      }

      // Fetch recent transactions (for list only)
      const transactionsResponse = await fetch('/api/transactions?limit=25&sort=created_on', { cache: 'no-store' });
      if (!transactionsResponse.ok) {
        throw new Error(`HTTP error! status: ${transactionsResponse.status}`);
      }
      const transactionsData = await transactionsResponse.json();
      
      // Fetch documents count
      const documentsResponse = await fetch('/api/documents', { cache: 'no-store' });
      if (!documentsResponse.ok) {
        throw new Error(`HTTP error! status: ${documentsResponse.status}`);
      }
      const documentsData = await documentsResponse.json();
      
      
      
      if (documentsData.success) {
        setDocumentCount(documentsData.data.length || 0);
      }
      
      const txns = transactionsData.data || [];
      setRecentTransactions(txns);
    } catch (error) {
      // You might want to show an error toast here
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const res = await fetch('/api/reports/generate', { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to generate report: ${res.status}`);
      const data = await res.json();
      // Trigger a JSON download for now; will be PDF later
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'financial-report.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingReport(false);
    }
  };

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
  const totalAmount = accountBreakdown.bank + accountBreakdown.loan + accountBreakdown.investment;
  const bankPct = totalAmount ? Math.round((accountBreakdown.bank / totalAmount) * 100) : 0;
  const loanPct = totalAmount ? Math.round((accountBreakdown.loan / totalAmount) * 100) : 0;
  // Ensure percentages sum to ~100 by assigning remainder to investment
  const investmentPct = Math.max(0, 100 - bankPct - loanPct);

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
            <AddTransactionButton onTransactionAdded={loadData} className="mt-4 ml-2.5" />
          </div>
        </div>
      </div>

      {/* Balance + Donut */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400">Net Worth</p>
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
            <h3 className="text-lg font-medium text-slate-50">Breakdown</h3>
          </div>
          <div className="mt-4 flex items-center gap-6">
            {/* Donut */}
            <div
              className="relative h-28 w-28 shrink-0"
              aria-label={`Loan ${loanPct}% Bank ${bankPct}% Investment ${investmentPct}%`}
            >
              <div
                className="h-full w-full rounded-full"
                style={{
                  background: `conic-gradient(#ef4444 0% ${loanPct}%, #3b82f6 ${loanPct}% ${loanPct + bankPct}%, #10b981 ${loanPct + bankPct}% 100%)`,
                }}
              />
              <div className="absolute inset-3 rounded-full bg-[var(--card)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="text-xs px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed shadow"
                >
                  {generatingReport ? 'Generating…' : 'Get report'}
                </button>
              </div>
            </div>
            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm text-slate-400">Loan</p>
                  <p className="font-medium">{formatINR(accountBreakdown.loan)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm text-slate-400">Bank</p>
                  <p className="font-medium">{formatINR(accountBreakdown.bank)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm text-slate-400">Investment</p>
                  <p className="font-medium">{formatINR(accountBreakdown.investment)}</p>
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
