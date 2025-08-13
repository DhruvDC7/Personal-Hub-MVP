'use client';

import { useEffect, useState } from 'react';
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

  // Listen for global events to open/close modal (from BottomNav)
  useEffect(() => {
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    window.addEventListener('open-feedback', open);
    window.addEventListener('close-feedback', close);
    return () => {
      window.removeEventListener('open-feedback', open);
      window.removeEventListener('close-feedback', close);
    };
  }, []);

  // Broadcast state so nav can toggle its icon
  useEffect(() => {
    try {
      if (isOpen) {
        window.dispatchEvent(new Event('open-feedback'));
      } else {
        window.dispatchEvent(new Event('close-feedback'));
      }
    } catch {}
  }, [isOpen]);

  // Auth guard AFTER hooks to preserve hook order across renders
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
      {/* Hidden floating trigger; modal is opened via 'open-feedback' custom event */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden"
        aria-label="Give feedback"
      />

      <Modal
        open={isOpen}
        onClose={() => {
          if (!isSubmitting) setIsOpen(false);
        }}
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
