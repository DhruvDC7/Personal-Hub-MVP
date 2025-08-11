/**
 * Pure functions to adapt API responses into UI friendly shapes.
 * All transformers below accept raw API JSON and return
 * simplified objects expected by the dashboard components.
 */

/**
 * Adapts overview metrics.
 * @param {Object} api Raw metrics from various endpoints
 * @returns {{netWorth:{amount:number,deltaPct:number}, totalAccounts:number, monthlyExpenses:{amount:number,deltaPct:number}, txCountThisMonth:number}}
 */
export function adaptOverview(api = {}) {
  const net = api.netWorth || {};
  const netCurr = Number(net.current) || 0;
  const netPrev = Number(net.previous) || 0;
  const netDelta = netPrev ? ((netCurr - netPrev) / netPrev) * 100 : 0;

  const exp = api.monthlyExpenses || {};
  const expCurr = Number(exp.current) || 0;
  const expPrev = Number(exp.previous) || 0;
  const expDelta = expPrev ? ((expCurr - expPrev) / expPrev) * 100 : 0;

  return {
    netWorth: { amount: netCurr, deltaPct: netDelta },
    totalAccounts: Number(api.totalAccounts) || 0,
    monthlyExpenses: { amount: expCurr, deltaPct: expDelta },
    txCountThisMonth: Number(api.txCountThisMonth) || 0,
  };
}

/**
 * Adapts net worth series data for the line chart.
 * @param {Array} api Array of { month: 'YYYY-MM', networth: number }
 * @returns {Array} Array of { label: 'Jan', value: number }
 */
export function adaptNetWorthSeries(api = []) {
  if (!Array.isArray(api)) return [];
  return api.map((item) => {
    const date = item.month ? new Date(`${item.month}-01`) : new Date();
    const label = date.toLocaleString('en-IN', { month: 'short' });
    return { label, value: Number(item.networth || item.value) || 0 };
  });
}

/**
 * Adapts expense breakdown data for the donut chart.
 * @param {Array} api Array of { category: string, amount: number }
 * @returns {Array} Array of { label: string, value: number }
 */
export function adaptExpenseBreakdown(api = []) {
  if (!Array.isArray(api)) return [];
  return api.map((item) => ({
    label: item.category || item.label,
    value: Number(item.amount || item.value) || 0,
  }));
}

/**
 * Adapts accounts list data.
 * @param {Array} api Raw accounts array
 * @returns {Array} Array of { name:string, balance:number, currency:string, trend:'up'|'down' }
 */
export function adaptAccounts(api = []) {
  if (!Array.isArray(api)) return [];
  return api.map((acc) => ({
    name: acc.name,
    balance: Number(acc.balance) || 0,
    currency: acc.currency || 'INR',
    trend: (Number(acc.balance) || 0) >= 0 ? 'up' : 'down',
  }));
}

/**
 * Adapts recent transactions list.
 * @param {Array} api Raw transactions array
 * @returns {Array} Array of { date:string, description:string, category:string, amount:number, currency:string }
 */
export function adaptRecentTx(api = []) {
  if (!Array.isArray(api)) return [];
  return api.map((tx) => ({
    date: tx.created_on || tx.date,
    description: tx.note || tx.description || tx.category,
    category: tx.category,
    amount: tx.type === 'expense' ? -Number(tx.amount) : Number(tx.amount),
    currency: tx.currency || 'INR',
  }));
}

