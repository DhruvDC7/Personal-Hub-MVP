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
      console.error('Error fetching documents:', error);
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
      console.error('Error deleting document:', error);
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
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-500"
          >
            View
          </a>
          <button
            onClick={() => handleDelete(doc.id)}
            className="text-red-600 hover:text-red-500"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Documents"
        actions={
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-sky-400 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0"
          >
            Upload Document
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
            data={documents} 
            emptyState={
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">No documents found</p>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-sky-400 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0"
                >
                  Upload Your First Document
                </button>
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
