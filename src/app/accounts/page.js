'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api('/api/accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }

    try {
      await api(`/api/accounts/${accountId}`, { method: 'DELETE' });
      showToast({ type: 'success', message: 'Account deleted successfully' });
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
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
  };

  const columns = [
    { 
      key: 'name', 
      header: 'Account Name',
      render: (account) => (
        <Link 
          href={`/transactions?account=${account._id}`}
          className="text-indigo-600 hover:text-indigo-900"
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
            className="text-indigo-600 hover:text-indigo-900"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(account._id)}
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
    fetchAccounts();
  }, [fetchAccounts]);

  return (
    <div>
      <PageHeader
        title="Accounts"
        actions={
          <button
            onClick={() => {
              setEditingAccount(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Account
          </button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <Table 
            columns={columns} 
            data={accounts} 
            emptyState={
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No accounts found</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Your First Account
                </button>
              </div>
            }
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
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
