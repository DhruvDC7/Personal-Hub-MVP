'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Card from '@/components/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

function UserFeedbackPageInner() {
  const { user, fetchWithAuth } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const isUser = (user?.role === 'user');

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const load = async () => {
    if (!isUser) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/feedback', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data?.feedback) ? data.feedback : [];
      setItems(list);
      if (list.length) setSelected(list[0]);
    } catch (e) {
      setError(e?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUser]);

  if (!isUser) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-sm text-red-400">403 · Users only</div>
        </Card>
        <div className="mt-4">
          <Button as={Link} href="/" variant="link">Back to Dashboard →</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Feedback</h1>
        <div className="flex items-center gap-2">
          <Button onClick={load} size="sm">Refresh</Button>
        </div>
      </div>

      <Card>
        {error ? (
          <div className="p-4 text-sm text-red-400">{error}</div>
        ) : loading ? (
          <div className="p-8 flex justify-center"><LoadingSpinner size="md" /></div>
        ) : (
          <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
            {items.map(f => (
              <button
                key={f.id}
                className={`w-full text-left p-4 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition ${selected?.id === f.id ? 'ring-1 ring-slate-600' : ''}`}
                onClick={() => { setSelected(f); setModalOpen(true); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-slate-200 flex-1 min-w-0">
                    {typeof f.rating === 'number' && f.rating > 0 ? (
                      <div className="mb-1 text-yellow-400">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i}>{i < f.rating ? '★' : '☆'}</span>
                        ))}
                      </div>
                    ) : null}
                    <div className="font-medium truncate">{f.ai?.summary || f.feedback_text?.slice(0,80) || 'Feedback'}</div>
                    <div className="text-xs text-slate-400 truncate">Submitted on {f.created_on ? formatDate(f.created_on) : '—'}</div>
                  </div>
                </div>
              </button>
            ))}
            {items.length === 0 && !loading && !error && (
              <div className="text-xs text-slate-400 py-6 text-center">You haven&apos;t submitted any feedback yet.</div>
            )}
          </div>
        )}
      </Card>

      {/* Modal */}
      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 w-[90%] max-w-2xl">
            <div className="p-5 rounded-lg bg-slate-900 border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Feedback Details</div>
                <button className="text-xs text-slate-300 hover:text-white" onClick={() => setModalOpen(false)}>Close</button>
              </div>

              {/* Key-Value meta */}
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div className="text-slate-400">Created</div>
                <div className="text-slate-200">{formatDate(selected.created_on)}</div>
                <div className="text-slate-400">Status</div>
                <div className="text-slate-200 capitalize">{selected.status || 'pending'}</div>
                <div className="text-slate-400">Sentiment</div>
                <div className="text-slate-200 capitalize">{selected.ai?.sentiment || '—'}</div>
                <div className="text-slate-400">Priority</div>
                <div className="text-slate-200 capitalize">{selected.ai?.priority || '—'}</div>
              </div>

              {/* AI Summary */}
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">AI - Summary</div>
                <div className="mt-1 text-sm text-slate-200">{selected.ai?.summary || '—'}</div>
              </div>

              {/* Rating */}
              {typeof selected.rating === 'number' && selected.rating > 0 && (
                <div className="mt-3 text-yellow-400">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i}>{i < selected.rating ? '★' : '☆'}</span>
                  ))}
                </div>
              )}

              {/* User Input */}
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Your Feedback</div>
                <div className="mt-1 text-sm whitespace-pre-wrap text-slate-200">{selected.feedback_text}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserFeedbackPage() {
  return (
    <ProtectedRoute>
      <UserFeedbackPageInner />
    </ProtectedRoute>
  );
}
