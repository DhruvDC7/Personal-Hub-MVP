import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import PageHeader from '@/components/PageHeader';
import AddTransactionButton from '@/components/AddTransactionButton';
import Card from '@/components/Card';
import StatsCard from '@/components/dashboard/StatsCard';
import AccountsList from '@/components/accounts/AccountsList';
import RecentTable from '@/components/transactions/RecentTable';
import ProtectedRoute from '@/components/ProtectedRoute';
import { monthParam, formatINR } from '@/lib/format';
import {
  adaptOverview,
  adaptNetWorthSeries,
  adaptExpenseBreakdown,
  adaptAccounts,
  adaptRecentTx,
} from './_adapters';

const NetWorthLine = dynamic(() => import('@/components/charts/NetWorthLine'), { ssr: false });
const ExpenseDonut = dynamic(() => import('@/components/charts/ExpenseDonut'), { ssr: false });

// Server component page that fetches dashboard data
export default async function Page() {
  const months = Array.from({ length: 6 }, (_, i) => dayjs().subtract(i, 'month'));
  const monthKeys = months.map((m) => monthParam(m));

  const fetchJson = async (url) => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      return await res.json();
    } catch (e) {
      console.error('Fetch failed', url, e);
      return null;
    }
  };

  const [netWorthApi, accountsApi, recentTxApi, ...monthApis] = await Promise.all([
    fetchJson('/api/metrics/networth'),
    fetchJson('/api/accounts'),
    fetchJson('/api/transactions?limit=5&sort=created_on'),
    ...monthKeys.map((m) => fetchJson(`/api/transactions?month=${m}`)),
  ]);

  const monthTx = monthApis.map((m) => (m && m.data ? m.data : []));
  const monthStats = monthTx.map((tx) => {
    let income = 0;
    let expense = 0;
    tx.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    });
    return { income, expense, net: income - expense };
  });

  const netWorthCurrent = netWorthApi?.data?.networth || 0;
  const prevNetWorth = netWorthCurrent - (monthStats[0]?.net || 0);

  const overviewRaw = {
    netWorth: { current: netWorthCurrent, previous: prevNetWorth },
    totalAccounts: accountsApi?.data?.length || 0,
    monthlyExpenses: {
      current: monthStats[0]?.expense || 0,
      previous: monthStats[1]?.expense || 0,
    },
    txCountThisMonth: monthTx[0]?.length || 0,
  };
  const overview = adaptOverview(overviewRaw);

  let running = netWorthCurrent;
  const netSeriesRaw = [];
  for (let i = 0; i < monthStats.length; i++) {
    netSeriesRaw.unshift({ month: monthKeys[i], networth: running });
    running -= monthStats[i]?.net || 0;
  }
  const netSeries = adaptNetWorthSeries(netSeriesRaw);

  const expenseRaw = Object.entries(
    monthTx[0]
      ?.filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {}) || {}
  ).map(([category, amount]) => ({ category, amount }));
  const expenseBreakdown = adaptExpenseBreakdown(expenseRaw);

  const accounts = adaptAccounts(accountsApi?.data || []);
  const recent = adaptRecentTx(recentTxApi?.data || []);

  return (
    <ProtectedRoute>
      <div>
        <PageHeader title="Personal Hub" actions={<AddTransactionButton />} />
        <p className="text-sm text-slate-400 mb-6">Welcome back! Here&apos;s your financial overview</p>

        <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Net Worth"
            value={formatINR(overview.netWorth.amount)}
            deltaPct={overview.netWorth.deltaPct}
          />
          <StatsCard title="Total Accounts" value={overview.totalAccounts} />
          <StatsCard
            title="Monthly Expenses"
            value={formatINR(overview.monthlyExpenses.amount)}
            deltaPct={overview.monthlyExpenses.deltaPct}
            valueClass="text-orange-400"
            deltaColor="text-orange-400"
          />
          <StatsCard
            title="Transactions"
            value={overview.txCountThisMonth}
            subtitle="This month"
          />
        </div>

        <div className="grid gap-4 mb-8 md:grid-cols-2">
          <Card>
            <h3 className="mb-4 text-lg font-medium text-slate-50">Net Worth Trend</h3>
            <NetWorthLine data={netSeries} />
          </Card>
          <Card>
            <h3 className="mb-4 text-lg font-medium text-slate-50">Expense Breakdown</h3>
            <ExpenseDonut data={expenseBreakdown} />
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="mb-4 text-lg font-medium text-slate-50">Accounts</h3>
            <AccountsList accounts={accounts} />
          </Card>
          <Card>
            <h3 className="mb-4 text-lg font-medium text-slate-50">Recent Transactions</h3>
            <RecentTable transactions={recent} />
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

