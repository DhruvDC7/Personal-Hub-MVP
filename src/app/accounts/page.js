'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatINR } from '@/lib/format';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Modal from '@/components/Modal';
import AccountForm from '@/components/Forms/AccountForm';
import PageHeader from '@/components/PageHeader';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const router = useRouter();

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api('/api/accounts');
      setAccounts(data);
    } catch (error) {
      // Error is handled by the UI state
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }

    try {
      await api(`/api/accounts?id=${accountId}`, { method: 'DELETE' });
      showToast({ type: 'success', message: 'Account deleted successfully' });
      fetchAccounts();
      router.refresh();
    } catch (error) {
      showToast({
        type: 'error',
        message: error.message || 'Failed to delete account. Please try again.'
      });
    }
  };

  const handleFormSubmit = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    fetchAccounts();
    router.refresh();
  };

  const columns = [
    { 
      key: 'name', 
      header: 'Account Name',
      render: (account) => (
        <Link 
          href={`/transactions?account=${account.id}`}
          className="text-sky-400 hover:text-sky-500"
        >
          {account.name}
        </Link>
      )
    },
    { 
      key: 'type', 
      header: 'Type',
      render: (account) => account.type.charAt(0).toUpperCase() + account.type.slice(1)
    },
    { 
      key: 'balance', 
      header: 'Balance',
      render: (account) => (
        <span className={account.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
          {formatINR(account.balance)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (account) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditingAccount(account);
              setIsModalOpen(true);
            }}
            className="text-sky-400 hover:text-sky-500"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(account.id)}
            className="text-red-600 hover:text-red-500"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // Initial data fetch
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return (
    <div>
      <PageHeader
        title="Accounts"
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-sky-400 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0"
          >
            Add Account
          </button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
          </div>
        ) : (
          <Table 
            columns={columns} 
            data={accounts} 
            emptyState={
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">No accounts found</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-sky-400 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0"
                >
                  Add Your First Account
                </button>
              </div>
            }
          />
        )}
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAccount(null);
        }}
        title={editingAccount ? 'Edit Account' : 'Add New Account'}
      >
        <AccountForm
          initialData={editingAccount || {}}
          onSuccess={handleFormSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingAccount(null);
          }}
        />
      </Modal>
    </div>
  );
}
