'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/fetcher';
import { downloadDocument, previewDocument, confirmAndDeleteDocument, updateDocumentTitle } from '@/lib/documents';
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
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const router = useRouter();

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/documents', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch documents');
      }

      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setDocuments(result.data);
      } else {
        setDocuments([]);
        if (!result.success) {
          throw new Error(result.error || 'Invalid response format');
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (documentId, documentName) => {
    const deleted = await confirmAndDeleteDocument(documentId, documentName);
    if (deleted) {
      fetchDocuments();
      router.refresh();
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

  const handleTitleEdit = (doc) => {
    setEditingId(doc.id);
    setEditTitle(doc.title || doc.filename);
  };

  const handleTitleSave = async (doc) => {
    if (!editTitle.trim()) {
      console.error('Title cannot be empty');
      return;
    }

    try {
      const result = await updateDocumentTitle(doc.id, editTitle.trim());
      if (result.success) {
        setDocuments(docs => 
          docs.map(d => 
            d.id === doc.id 
              ? { ...d, title: editTitle.trim() } 
              : d
          )
        );
        console.log('Title updated successfully');
      }
    } catch (error) {
      console.error('Failed to update title:', error.message || 'Unknown error');
    } finally {
      setEditingId(null);
      setEditTitle('');
    }
  };

  const handleKeyDown = (e, doc) => {
    if (e.key === 'Enter') {
      handleTitleSave(doc);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditTitle('');
    }
  };

  const columns = [
    { 
      key: 'title', 
      header: 'Title',
      render: (doc) => (
        <div className="flex items-center space-x-2">
          {editingId === doc.id ? (
            <div className="flex items-center space-x-2 w-full">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, doc)}
                className="flex-1 px-2 py-1 border rounded text-sm"
                autoFocus
              />
              <button
                onClick={() => handleTitleSave(doc)}
                className="ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setEditTitle('');
                }}
                className="ml-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center group">
              <span className="mr-2">{doc.title || doc.filename}</span>
              <button
                onClick={() => handleTitleEdit(doc)}
                className="ml-2 text-xs text-blue-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'type', 
      header: 'Type',
      render: (doc) => {
        if (!doc.contentType) return 'Unknown';
        // Show a more user-friendly type name
        const typeMap = {
          'application/pdf': 'PDF',
          'image/': 'Image',
          'text/': 'Text',
          'application/msword': 'Word',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
          'application/vnd.ms-excel': 'Excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
          'application/vnd.ms-powerpoint': 'PowerPoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
        };
        
        const type = Object.entries(typeMap).find(([key]) => 
          doc.contentType.startsWith(key)
        )?.[1] || doc.contentType.split('/').pop().toUpperCase();
        
        return type;
      }
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
        <div className="flex space-x-3">
          <button
            onClick={() => previewDocument(doc.id)}
            className="text-sky-400 hover:text-sky-500 transition-colors"
            title="Preview document"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => downloadDocument(doc.id, doc.filename)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Download document"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => handleDelete(doc.id, doc.title)}
            className="text-red-500 hover:text-red-600 transition-colors"
            title="Delete document"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
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
