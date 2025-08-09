'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, uploadFile } from '@/lib/fetcher';
import { showToast } from '@/lib/ui';

export default function DocumentUpload({ onSuccess, onCancel }) {
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
      // Step 1: Get presigned URL from our API
      const { url, documentId } = await api('/api/documents/presign', {
        method: 'POST',
        body: {
          filename: file.name,
          contentType: file.type,
          title,
        },
      });

      await uploadFile(url, file);

      showToast({
        type: 'success',
        message: 'Document uploaded successfully',
      });
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error uploading document:', error);
      showToast({
        type: 'error',
        message: error.message || 'Failed to upload document. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-md bg-slate-900 text-slate-100">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-300"
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
            <div className="flex text-sm text-slate-100">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-transparent rounded-md font-medium text-sky-400 hover:text-sky-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-sky-400 focus-within:ring-offset-0"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-slate-300">PDF, JPG, PNG, DOCX up to 10MB</p>
            {file && (
              <p className="text-sm text-slate-100 truncate">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-300">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-700 shadow-sm focus:border-sky-400 sm:text-sm"
          placeholder="Enter a title for this document"
          required
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-lg border border-sky-400 bg-transparent py-2 px-4 text-sm font-medium text-sky-400 shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0"
          disabled={isUploading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!file || isUploading}
          className="inline-flex justify-center rounded-lg border border-transparent bg-sky-400 hover:bg-sky-500 py-2 px-4 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0 disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>
    </form>
  );
}
