'use client';

import { useState } from 'react';
import Modal from './Modal';
import Button from './ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function FeedbackButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback_text: feedback.trim(),
          rating: rating || null,
          context: {
            path: window.location.pathname,
            ua: navigator.userAgent,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');
      
      const data = await response.json();
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'success',
            message: data.message || 'Feedback taken',
          },
        })
      );
      
      setFeedback('');
      setRating(0);
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'error',
            message: 'Failed to submit feedback. Please try again.',
          },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg hover:bg-[var(--accent-hover)] hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
        aria-label="Give feedback"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>

      <Modal
        open={isOpen}
        onClose={() => !isSubmitting && setIsOpen(false)}
        title="Share Your Feedback"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="feedback"
              className="block text-sm font-medium text-[var(--foreground)] mb-2"
            >
              Your feedback helps us improve
            </label>
            <textarea
              id="feedback"
              rows={4}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--input)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              placeholder="What's on your mind?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-[var(--foreground)] mb-2">
              How would you rate your experience? (optional)
            </p>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`text-2xl ${
                    (hoverRating || rating) >= star
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  disabled={isSubmitting}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={!feedback.trim() || isSubmitting}
            >
              Submit Feedback
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
