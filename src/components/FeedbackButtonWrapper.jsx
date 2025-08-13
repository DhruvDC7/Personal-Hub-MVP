'use client';

import dynamic from 'next/dynamic';

// Dynamically import the FeedbackButton with SSR disabled
const FeedbackButton = dynamic(
  () => import('@/components/FeedbackButton'),
  { ssr: false }
);

export default function FeedbackButtonWrapper() {
  return <FeedbackButton />;
}
