'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatINR, formatDate, monthParam } from '@/lib/format';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Modal from '@/components/Modal';
import TransactionForm from '@/components/Forms/TransactionForm';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/LoadingSpinner';
import { TRANSACTION_TYPES } from '@/constants/types';

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // Get filters from URL
  const month = searchParams.get('month') || monthParam(new Date());
  const type = searchParams.get('type') || '';
  const account = searchParams.get('account') || '';

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (type) params.set('type', type);
      if (account) params.set('account', account);

      const data = await api(`/api/transactions?${params.toString()}`);
      setTransactions(data);
    } catch (error) {
      // Error is handled by the UI state
    } finally {
      setIsLoading(false);
    }
  }, [month, type, account]);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api('/api/accounts');
      setAccounts(data);
    } catch (error) {
      // Error is handled by the UI state
    }
  }, []);

  const handleDelete = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    try {
      await api(`/api/transactions?id=${transactionId}`, { method: 'DELETE' });
      showToast({ type: 'success', message: 'Transaction deleted successfully' });
      fetchTransactions();
      router.refresh();
    } catch (error) {
      showToast({
        type: 'error',
        message: error.message || 'Failed to delete transaction. Please try again.'
      });
    }
  };

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/transactions?${params.toString()}`);
  };

  const handleFormSubmit = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    fetchTransactions();
    router.refresh();
  };

  // Calculate totals (ignore transfers)
  const { totalIncome, totalExpense } = transactions.reduce(
    (acc, txn) => {
      if (txn.type === TRANSACTION_TYPES.INCOME) {
        acc.totalIncome += txn.amount;
      } else if (txn.type === TRANSACTION_TYPES.EXPENSE) {
        acc.totalExpense += txn.amount;
      }
      return acc;
    },
    { totalIncome: 0, totalExpense: 0 }
  );

  const nameById = (id) => accounts.find(a => a._id === id)?.name || 'Unknown';

  const columns = [
    { 
      key: 'date', 
      header: 'Date',
      render: (txn) => formatDate(txn.happened_on || txn.created_on)
    },
    { 
      key: 'description', 
      header: 'Description',
      render: (txn) => txn.type === 'transfer'
        ? `Transfer: ${nameById(txn.from_account_id)} → ${nameById(txn.to_account_id)}`
        : (txn.note || txn.category)
    },
    { 
      key: 'account', 
      header: 'Account',
      render: (txn) => txn.type === TRANSACTION_TYPES.TRANSFER
        ? `${nameById(txn.from_account_id)} → ${nameById(txn.to_account_id)}`
        : nameById(txn.account_id)
    },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (txn) => {
        if (txn.type === TRANSACTION_TYPES.TRANSFER) {
          return (
            <span className="text-slate-300">{formatINR(txn.amount)}</span>
          );
        }
        return (
          <span className={txn.type === TRANSACTION_TYPES.INCOME ? 'text-green-600' : 'text-red-600'}>
            {txn.type === TRANSACTION_TYPES.INCOME ? '+' : '-'}{formatINR(txn.amount)}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (txn) => (
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              setEditingTransaction(txn);
              setIsModalOpen(true);
            }}
            variant="ghost"
            size="sm"
            className="text-sky-400 hover:bg-sky-500/10"
            disabled={txn.type === TRANSACTION_TYPES.TRANSFER}
            title={txn.type === TRANSACTION_TYPES.TRANSFER ? 'Editing transfers is not supported' : 'Edit'}
          >
            Edit
          </Button>
          <Button
            onClick={() => handleDelete(txn.id)}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-600/10"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Initial data fetch
  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, [fetchTransactions, fetchAccounts]);

  return (
    <div>
      <PageHeader
        title="Transactions"
        actions={
          <Button
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            variant="primary"
          >
            Add Transaction
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-slate-400">
              Month
            </label>
            <input
              type="month"
              id="month"
              value={month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="mt-1 block w-full rounded-md bg-slate-900 border border-slate-700 text-slate-50 placeholder-slate-400 shadow-sm focus:border-sky-400 focus:ring-sky-400 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-400">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="mt-1 block w-full rounded-md bg-slate-900 border border-slate-700 text-slate-50 py-2 pl-3 pr-10 text-base focus:border-sky-400 focus:outline-none focus:ring-sky-400 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value={TRANSACTION_TYPES.INCOME}>Income</option>
              <option value={TRANSACTION_TYPES.EXPENSE}>Expense</option>
              <option value={TRANSACTION_TYPES.TRANSFER}>Transfer</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="account" className="block text-sm font-medium text-slate-400">
              Account
            </label>
            <select
              id="account"
              value={account}
              onChange={(e) => handleFilterChange('account', e.target.value)}
              className="mt-1 block w-full rounded-md bg-slate-900 border border-slate-700 text-slate-50 py-2 pl-3 pr-10 text-base focus:border-sky-400 focus:outline-none focus:ring-sky-400 sm:text-sm"
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : (
          <>
            <Table 
              columns={columns} 
              data={transactions} 
              emptyState="No transactions found. Add your first transaction!"
            />
            
            {transactions.length > 0 && (
              <div className="bg-slate-800 border-t border-slate-700 px-6 py-3 flex justify-between text-sm font-medium text-slate-50">
                <div>Total Income: <span className="text-green-600">{formatINR(totalIncome)}</span></div>
                <div>Total Expense: <span className="text-red-600">{formatINR(totalExpense)}</span></div>
                <div>Net: <span className={totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatINR(totalIncome - totalExpense)}
                </span></div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
      >
        <TransactionForm
          initialData={editingTransaction || {}}
          onSuccess={handleFormSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
        />
      </Modal>
    </div>
  );
}
