'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import DocumentUpload from '@/components/Forms/DocumentUpload';
import { previewDocument, deleteDocument, updateDocumentTitle } from '@/lib/documents';
import { showToast } from '@/lib/ui';

export default function DocumentsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [query, setQuery] = useState('');

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) setDocuments(data.data);
    } catch (e) {
      // optional toast
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  const onStartEdit = (doc) => {
    setEditingId(doc.id);
    setEditingTitle(doc.title || doc.filename);
  };

  // no-op: inner scroll reset removed

  const onSaveTitle = async () => {
    try {
      await updateDocumentTitle(editingId, editingTitle);
      setEditingId(null);
      await loadDocuments();
    } catch {}
  };

  const onDelete = async (id, name) => {
    try {
      await deleteDocument(id);
      await loadDocuments();
    } catch {}
  };

  const normalized = (s = '') => s.toLowerCase();
  const filteredDocs = documents.filter((d) => {
    if (!query) return true;
    const q = normalized(query);
    const metaTitle = normalized(d?.metadata?.title || '');
    return metaTitle.includes(q);
  });

  return (
    <div className="max-w-3xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto p-6 flex-1 overflow-hidden flex flex-col">
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <h1 className="text-xl font-semibold text-slate-50">Documents</h1>
        <p className="text-slate-400 text-sm">Upload, view and manage your documents</p>
      </div>

      {/* Sticky Controls (Search + Upload) */}
      <div className="mb-4 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-50 text-center md:text-left">All Documents</h2>
          <div className="flex w-full md:w-auto items-center gap-2 flex-wrap sm:flex-nowrap">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              className="min-w-0 basis-full sm:basis-auto flex-1 md:w-72 bg-slate-700 border border-slate-600 rounded-md text-white text-sm px-3 py-2 placeholder-slate-400"
            />
            <Button onClick={() => setQuery((q) => q.trim())} variant="outline" className="text-sm shrink-0 w-full sm:w-auto">Search</Button>
            <Button onClick={() => setIsUploading(true)} variant="primary" className="text-sm shrink-0 w-full sm:w-auto">Upload</Button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsUploading(false)} />
          <div className="relative z-10 w-full max-w-lg mx-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <h3 className="text-sm font-medium text-slate-50">Upload Document</h3>
                <button
                  className="text-slate-400 hover:text-slate-200 transition"
                  onClick={() => setIsUploading(false)}
                  aria-label="Close upload"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <DocumentUpload
                  onSuccess={() => {
                    setIsUploading(false);
                    loadDocuments();
                  }}
                  onCancel={() => setIsUploading(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List (Scrollable) */}
      <div className="flex-1 bg-slate-800 rounded-2xl p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-40"><LoadingSpinner size="lg" /></div>
        ) : filteredDocs.length === 0 ? (
          <p className="text-slate-400 text-sm">No documents uploaded yet.</p>
        ) : (
          <>
            {/* Tablet-only header (hidden on mobile and desktop grid) */}
            <div className="hidden md:flex lg:hidden text-xs uppercase tracking-wide text-slate-400 pb-2 px-1">
              <div className="flex-1">Name</div>
              <div className="w-24 text-right">Size</div>
              <div className="w-40 text-right">Actions</div>
            </div>
            <ul className="divide-y divide-white/10 md:divide-white/20 lg:divide-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:gap-4 xl:gap-6">
              {filteredDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col gap-3 md:flex-row md:items-center md:gap-4 lg:rounded-xl lg:border lg:border-slate-700 lg:bg-slate-900/40 lg:p-4"
                >
                  {/* Left: icon + name (flex-1) */}
                  <div className="flex items-start gap-3 md:flex-1">
                    <div className="h-10 w-10 rounded-lg bg-indigo-500/15 text-indigo-300 grid place-items-center">📄</div>
                    <div className="min-w-0">
                      {editingId === doc.id ? (
                        <input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 rounded-md text-white text-sm px-2 py-1"
                        />
                      ) : (
                        <p className="font-medium break-words md:truncate">{doc.title || doc.filename}</p>
                      )}
                      {/* Mobile and desktop-card meta: show size */}
                      <div className="text-xs text-slate-400 mt-0.5 md:hidden lg:block">
                        {Math.round((doc.size || 0)/1024)} KB
                      </div>
                    </div>
                  </div>

                  {/* Middle-right: Size (tablet only) */}
                  <div className="hidden md:block lg:hidden w-24 text-sm text-slate-300 text-right">
                    {Math.round((doc.size || 0)/1024)} KB
                  </div>

                  {/* Right: Actions */}
                  {editingId === doc.id ? (
                    <div className="flex flex-wrap gap-2 md:justify-end md:w-40 lg:justify-start lg:w-auto">
                      <Button onClick={onSaveTitle} size="sm" className="shrink-0">Save</Button>
                      <Button onClick={() => setEditingId(null)} variant="outline" size="sm" className="shrink-0">Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 md:justify-end md:w-40 lg:justify-start lg:w-auto">
                      <Button onClick={() => previewDocument(doc.id)} size="sm" variant="outline" className="shrink-0">Open</Button>
                      <Button onClick={() => onStartEdit(doc)} size="sm" variant="outline" className="shrink-0">Rename</Button>
                      <Button onClick={() => onDelete(doc.id, doc.title)} size="sm" variant="danger" className="shrink-0">Delete</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
