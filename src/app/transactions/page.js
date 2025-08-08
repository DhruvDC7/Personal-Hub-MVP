'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatINR, formatDate, monthParam } from '@/lib/format';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Modal from '@/components/Modal';
import TransactionForm from '@/components/Forms/TransactionForm';
import PageHeader from '@/components/PageHeader';

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

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (type) params.set('type', type);
      if (account) params.set('account', account);
      
      const data = await api(`/api/transactions?${params.toString()}`);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await api('/api/accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleDelete = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    try {
      await api(`/api/transactions/${transactionId}`, { method: 'DELETE' });
      showToast({ type: 'success', message: 'Transaction deleted successfully' });
      fetchTransactions();
      router.refresh();
    } catch (error) {
      console.error('Error deleting transaction:', error);
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

  // Calculate totals
  const { totalIncome, totalExpense } = transactions.reduce(
    (acc, txn) => {
      if (txn.type === 'income') {
        acc.totalIncome += txn.amount;
      } else {
        acc.totalExpense += txn.amount;
      }
      return acc;
    },
    { totalIncome: 0, totalExpense: 0 }
  );

  const columns = [
    { 
      key: 'date', 
      header: 'Date',
      render: (txn) => formatDate(txn.happened_on)
    },
    { 
      key: 'description', 
      header: 'Description',
      render: (txn) => txn.note || txn.category
    },
    { 
      key: 'account', 
      header: 'Account',
      render: (txn) => accounts.find(a => a._id === txn.account)?.name || 'Unknown'
    },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (txn) => (
        <span className={txn.type === 'income' ? 'text-green-600' : 'text-red-600'}>
          {txn.type === 'income' ? '+' : '-'}{formatINR(txn.amount)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (txn) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditingTransaction(txn);
              setIsModalOpen(true);
            }}
            className="text-indigo-600 hover:text-indigo-900"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(txn._id)}
            className="text-red-600 hover:text-red-900"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // Initial data fetch
  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, [month, type, account]);

  return (
    <div>
      <PageHeader
        title="Transactions"
        actions={
          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Transaction
          </button>
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700">
              Month
            </label>
            <input
              type="month"
              id="month"
              value={month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="account" className="block text-sm font-medium text-gray-700">
              Account
            </label>
            <select
              id="account"
              value={account}
              onChange={(e) => handleFilterChange('account', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <Table 
              columns={columns} 
              data={transactions} 
              emptyState="No transactions found. Add your first transaction!"
            />
            
            {transactions.length > 0 && (
              <div className="bg-gray-50 px-6 py-3 flex justify-between text-sm font-medium">
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
        isOpen={isModalOpen}
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
