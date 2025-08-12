'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatINR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Modal from '@/components/Modal';
import AccountForm from '@/components/Forms/AccountForm';
import PageHeader from '@/components/PageHeader';
import { LoadingBlock } from '@/components/ui/LoadingSpinner';

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
    if (!window.confirm('This will permanently delete the account and all its transactions. Continue?')) {
      return;
    }

    try {
      await api(`/api/accounts?id=${accountId}&force=true`, { method: 'DELETE' });
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
          href={`/transactions?account=${account._id}`}
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
        <span className={account.type === 'loan' ? 'text-red-600' : (account.balance >= 0 ? 'text-green-600' : 'text-red-600')}>
          {formatINR(account.balance)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (account) => (
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              setEditingAccount(account);
              setIsModalOpen(true);
            }}
            variant="ghost"
            className="text-sky-400 hover:bg-sky-500/10"
            size="sm"
          >
            Edit
          </Button>
          <Button
            onClick={() => handleDelete(account._id)}
            variant="ghost"
            className="text-red-600 hover:bg-red-600/10"
            size="sm"
          >
            Delete
          </Button>
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
          <Button
            onClick={() => {
              setEditingAccount(null);
              setIsModalOpen(true);
            }}
            variant="primary"
          >
            Add Account
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : (
          <Table 
            columns={columns} 
            data={accounts} 
            emptyState={
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">No accounts found</p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  variant="primary"
                  className="mt-2"
                >
                  Add Your First Account
                </Button>
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
