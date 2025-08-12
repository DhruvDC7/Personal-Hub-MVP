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
  const [accounts, setAccounts] = useState([]);
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
        setAccounts(accountsData.data);
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
      // Build a styled HTML report and download it
      const reportDate = new Date().toLocaleString();
      const fmt = (n) => {
        try {
          return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));
        } catch {
          return String(n);
        }
      };

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Financial Report</title>
<style>
  :root {
    --bg: #0b1220;
    --card: #0f172a;
    --text: #e5e7eb;
    --muted: #94a3b8;
    --success: #10b981; /* investment */
    --danger: #ef4444; /* loan */
    --bank: #f59e0b;   /* bank (yellow) */
    --border: #1f2937;
  }
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: var(--bg); color: var(--text); }
  .container { max-width: 960px; margin: 0 auto; padding: 24px; }
  .header { background: linear-gradient(135deg, #facc15, #f59e0b); color: #111827; padding: 24px; border-radius: 16px; }
  .header h1 { margin: 0 0 6px; font-size: 24px; }
  .meta { font-size: 12px; color: #111827; opacity: 0.8; }
  .user { margin-top: 6px; font-size: 12px; color: #111827; display: grid; gap: 2px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
  .card h3 { margin: 0 0 8px; font-size: 14px; color: var(--muted); font-weight: 600; }
  .stat { font-size: 22px; font-weight: 700; }
  .row { display: flex; gap: 16px; align-items: center; }
  .pill { display:inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; }
  .pill.loan { background: rgba(239,68,68,.15); color: var(--danger); }
  .pill.bank { background: rgba(245,158,11,.15); color: var(--bank); }
  .pill.inv { background: rgba(16,185,129,.15); color: var(--success); }
  .table-wrap { width: 100%; overflow-x: auto; border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; min-width: 560px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 13px; }
  th { color: var(--muted); font-weight: 600; background: #0b152a; }
  .muted { color: var(--muted); font-size: 12px; }
  .legend { display:flex; gap: 12px; align-items: center; margin: 8px 0 0; }
  .dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
  .loan { background: var(--danger); }
  .bank { background: var(--bank); }
  .inv { background: var(--success); }
  .footer { margin-top: 24px; color: var(--muted); font-size: 12px; text-align: center; }

  /* Responsive styles */
  @media (max-width: 640px) {
    .container { padding: 14px; }
    .header { padding: 16px; border-radius: 12px; }
    .header h1 { font-size: 18px; }
    .meta, .user { font-size: 11px; }
    .grid { grid-template-columns: 1fr; gap: 12px; }
    .card { padding: 12px; }
    .stat { font-size: 18px; }
    th, td { padding: 8px 10px; font-size: 12px; }
  }
  @media (min-width: 641px) and (max-width: 1024px) {
    .grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Financial Report</h1>
      <div class="meta">Generated on ${reportDate}</div>
      <div class="user">
        ${(() => { try { return (function(u){
          if (!u) return '';
          const lines = [];
          if (u.name) lines.push(`Name: ${u.name}`);
          if (u.email) lines.push(`Email: ${u.email}`);
          if (u.phone) lines.push(`Phone: ${u.phone}`);
          return lines.length ? lines.join(' · ') : '';
        })((data?.summary?.user) ?? (data?.data?.summary?.user)); } catch { return ''; } })()}
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Net Worth</h3>
        <div class="stat">${fmt(netWorth.networth ?? 0)}</div>
      </div>
      <div class="card">
        <h3>Bank</h3>
        <div class="stat" style="color: var(--bank)">${fmt(accountBreakdown.bank)}</div>
        <div class="legend"><span class="dot bank"></span><span class="muted">Bank holdings</span></div>
      </div>
      <div class="card">
        <h3>Breakdown</h3>
        <div class="row">
          <span class="pill loan">Loan: ${fmt(accountBreakdown.loan)}</span>
          <span class="pill bank">Bank: ${fmt(accountBreakdown.bank)}</span>
          <span class="pill inv">Investment: ${fmt(accountBreakdown.investment)}</span>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>Accounts</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${(Array.isArray(data?.accounts) ? data.accounts : (data?.data?.accounts || [])).map(a => `
              <tr>
                <td>${a.name ?? ''}</td>
                <td>${a.type ?? ''}</td>
                <td>${fmt(a.balance)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="muted">If any field is empty,please contact support.</div>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>Recent Transactions</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Note</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(Array.isArray(data?.transactions) ? data.transactions : (data?.data?.transactions || [])).slice(0, 25).map(t => `
              <tr>
                <td>${t.created_on ? new Date(t.created_on).toLocaleDateString() : ''}</td>
                <td>${t.category ?? ''}</td>
                <td>${t.note ?? ''}</td>
                <td>${t.type ?? ''}</td>
                <td>${fmt(t.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">Confidential · Personal Finance Report</div>
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'financial-report.html';
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
                  background: `conic-gradient(#ef4444 0% ${loanPct}%, #f59e0b ${loanPct}% ${loanPct + bankPct}%, #10b981 ${loanPct + bankPct}% 100%)`,
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
                <span className="h-3 w-3 rounded-full bg-amber-500" />
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
              <div className="mx-auto h-8 w-8 rounded-lg bg-yellow-600/20 text-yellow-300 grid place-items-center">🏦</div>
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
              {recentTransactions.slice(0, 7).map((txn) => {
                const idOf = (x) => (typeof x === 'string' ? x : (x?._id || x?.$oid || x?.oid || x));
                const getAcc = (id) => accounts.find(a => (idOf(a._id) === idOf(id)));
                let accountLine = '';
                if (String(txn.type || '').toLowerCase() === 'transfer') {
                  const fromAcc = getAcc(txn.from_account_id);
                  const toAcc = getAcc(txn.to_account_id);
                  accountLine = `${fromAcc?.name || '—'} → ${toAcc?.name || '—'}`;
                } else {
                  const acc = getAcc(txn.account_id);
                  accountLine = acc?.name || '';
                }
                return (
                  <li key={txn.id || txn._id || txn.created_on} className="flex items-center gap-3 p-4">
                    <div className={`h-10 w-10 rounded-full grid place-items-center text-sm font-semibold ${txn.type === 'income' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {txn.category?.[0]?.toUpperCase() || '₹'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{txn.note || txn.category || 'Transaction'}</p>
                      <p className="text-xs text-slate-400">{new Date(txn.created_on).toLocaleDateString()}</p>
                      {accountLine ? (
                        <p className="text-xs text-slate-400 mt-0.5">{accountLine}</p>
                      ) : null}
                    </div>
                    <div className={`text-right shrink-0 ${txn.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {txn.type === 'income' ? '+' : '-'}{formatINR(Math.abs(txn.amount))}
                    </div>
                  </li>
                );
              })}
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
