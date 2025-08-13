// Centralized single source of truth for account and transaction types
// Keep canonical keys in lowercase to match stored values

export const ACCOUNT_TYPES = {
  BANK: 'bank',
  WALLET: 'wallet',
  CASH: 'cash',
  INVESTMENT: 'investment',
  LOAN: 'loan',
  CREDIT_CARD: 'credit card',
  OTHER: 'other',
};

export const TRANSACTION_TYPES = {
  EXPENSE: 'expense',
  INCOME: 'income',
  TRANSFER: 'transfer',
};

// Categories often referenced as literals
export const CATEGORY_TRANSFER = 'Transfer';
export const CATEGORY_EMI = 'EMI Payment';

// Arrays for validation/selects
export const ACCOUNT_TYPE_VALUES = [
  ACCOUNT_TYPES.BANK,
  ACCOUNT_TYPES.WALLET,
  ACCOUNT_TYPES.INVESTMENT,
  ACCOUNT_TYPES.LOAN,
];

export const TRANSACTION_TYPE_VALUES = [
  TRANSACTION_TYPES.EXPENSE,
  TRANSACTION_TYPES.INCOME,
  TRANSACTION_TYPES.TRANSFER,
];

// Options for selects (UI)
export const ACCOUNT_TYPE_OPTIONS = [
  { value: ACCOUNT_TYPES.BANK, label: 'Bank Account' },
  { value: ACCOUNT_TYPES.WALLET, label: 'Cash/Wallet' },
  { value: ACCOUNT_TYPES.INVESTMENT, label: 'Investment' },
  { value: ACCOUNT_TYPES.LOAN, label: 'Loan' },
];

export const TRANSACTION_TYPE_OPTIONS = [
  { value: TRANSACTION_TYPES.EXPENSE, label: 'Expense' },
  { value: TRANSACTION_TYPES.INCOME, label: 'Income' },
  { value: TRANSACTION_TYPES.TRANSFER, label: 'Transfer' },
];

// Synonym groups for computing breakdowns and heuristics
export const BANK_TYPE_SYNONYMS = new Set([
  'bank', 'cash', 'wallet', 'savings', 'current', 'checking', 'asset', ''
]);

export const LOAN_TYPE_SYNONYMS = new Set([
  'loan', 'liability', 'credit', 'credit card', 'mortgage'
]);

export const INVESTMENT_TYPE_SYNONYMS = new Set([
  'investment', 'investments', 'mutual fund', 'mutual funds', 'equity', 'stock', 'stocks', 'sip', 'fd', 'rd', 'bond', 'bonds', 'crypto'
]);

// Ordering preference used in matching accounts by name
export const ACCOUNT_TYPE_PRIORITY = {
  [ACCOUNT_TYPES.BANK]: 5,
  [ACCOUNT_TYPES.CASH]: 4,
  [ACCOUNT_TYPES.WALLET]: 4,
  [ACCOUNT_TYPES.CREDIT_CARD]: 3,
  [ACCOUNT_TYPES.LOAN]: 2,
  [ACCOUNT_TYPES.INVESTMENT]: 1,
  [ACCOUNT_TYPES.OTHER]: 1,
};

export const typePriority = (t) => {
  const key = String(t || ACCOUNT_TYPES.OTHER).toLowerCase();
  return ACCOUNT_TYPE_PRIORITY[key] || 1;
};

// Normalizers (best-effort)
const norm = (s) => (s || '').toString().trim().toLowerCase();

export function normalizeAccountType(t) {
  const s = norm(t);
  if (LOAN_TYPE_SYNONYMS.has(s)) return ACCOUNT_TYPES.LOAN;
  if (INVESTMENT_TYPE_SYNONYMS.has(s)) return ACCOUNT_TYPES.INVESTMENT;
  if (BANK_TYPE_SYNONYMS.has(s)) return ACCOUNT_TYPES.BANK;
  return s || ACCOUNT_TYPES.BANK; // fallback asset-like
}

export function normalizeTransactionType(t) {
  const s = norm(t);
  if (s === TRANSACTION_TYPES.TRANSFER) return TRANSACTION_TYPES.TRANSFER;
  if (s === TRANSACTION_TYPES.INCOME) return TRANSACTION_TYPES.INCOME;
  return TRANSACTION_TYPES.EXPENSE;
}
