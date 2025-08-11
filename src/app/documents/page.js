'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Modal from '@/components/Modal';
import DocumentUpload from '@/components/Forms/DocumentUpload';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/LoadingSpinner';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const router = useRouter();

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await api('/api/documents');
      setDocuments(data);
    } catch (error) {
      // Error is handled by the UI state
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await api(`/api/documents?id=${documentId}`, { method: 'DELETE' });
      showToast({ type: 'success', message: 'Document deleted successfully' });
      fetchDocuments();
      router.refresh();
    } catch (error) {
      showToast({
        type: 'error',
        message: error.message || 'Failed to delete document. Please try again.'
      });
    }
  };

  const handleUploadSuccess = () => {
    setIsUploadModalOpen(false);
    fetchDocuments();
    router.refresh();
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const columns = [
    { 
      key: 'title', 
      header: 'Title',
      render: (doc) => (
        <a 
          href={doc.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-500"
        >
          {doc.title}
        </a>
      )
    },
    { 
      key: 'type', 
      header: 'Type',
      render: (doc) => doc.contentType || 'Unknown'
    },
    { 
      key: 'size', 
      header: 'Size',
      render: (doc) => {
        if (!doc.size) return 'N/A';
        const sizeInMB = doc.size / (1024 * 1024);
        return `${sizeInMB.toFixed(2)} MB`;
      }
    },
    { 
      key: 'uploadedAt', 
      header: 'Uploaded',
      render: (doc) => formatDate(doc.uploadedAt)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (doc) => (
        <div className="flex space-x-2">
          <Button
            as="a"
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            size="sm"
            className="text-sky-400 hover:bg-sky-500/10"
          >
            View
          </Button>
          <Button
            onClick={() => handleDelete(doc.id)}
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

  return (
    <div>
      <PageHeader
        title="Documents"
        actions={
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            variant="primary"
          >
            Upload Document
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : (
          <Table 
            columns={columns} 
            data={documents} 
            emptyState={
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">No documents found</p>
                <Button
                  onClick={() => setIsUploadModalOpen(true)}
                  variant="primary"
                  className="mt-2"
                >
                  Upload Your First Document
                </Button>
              </div>
            }
          />
        )}
      </Card>

      <Modal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document"
      >
        <DocumentUpload
          onSuccess={handleUploadSuccess}
          onCancel={() => setIsUploadModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
