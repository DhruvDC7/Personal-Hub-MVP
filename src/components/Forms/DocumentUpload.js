'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, uploadFile } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';
import { Button } from '@/components/ui/Button';

export default function DocumentUpload({ onSuccess, onCancel, documentId }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Set default title to filename without extension
      const fileName = selectedFile.name.split('.').slice(0, -1).join('.');
      setTitle(fileName);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      showToast({ type: 'error', message: 'Please select a file to upload' });
      return;
    }

    if (!title.trim()) {
      showToast({ type: 'error', message: 'Please enter a title' });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'x-filename': file.name,
          'x-title': title,
          ...(documentId && { 'x-document-id': documentId }),
        },
        body: file,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to upload document');
      }

      const result = await response.json();

      showToast({
        type: 'success',
        message: documentId ? 'Document updated successfully' : 'Document uploaded successfully',
      });
      
      router.refresh();
      if (onSuccess) onSuccess(result);
    } catch (error) {
      showToast({
        type: 'error',
        message: error.message || 'Failed to upload document. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--input)]">
          <div className="space-y-3 text-center">
            <svg
              className="mx-auto h-12 w-12 text-[var(--muted)]"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex flex-col items-center text-sm">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-lg font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 px-3 py-1.5 transition-colors"
              >
                <span>Choose a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </label>
              <p className="text-[var(--muted)] mt-1">or drag and drop</p>
            </div>
            <p className="text-xs text-[var(--muted)]">PDF, JPG, PNG, DOCX up to 10MB</p>
          </div>
        </div>
        {file && (
          <p className="mt-2 text-sm text-[var(--foreground)] font-medium truncate">
            Selected: <span className="text-[var(--muted)]">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          </p>
        )}
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-[var(--muted)] mb-1">
          Document Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-lg bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] py-2.5 px-3 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-colors"
          placeholder="Enter a title for this document"
          required
        />
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isUploading}
        >
          {isUploading ? (documentId ? 'Updating...' : 'Uploading...') : (documentId ? 'Update Document' : 'Upload Document')}
        </Button>
      </div>
    </form>
  );
}
