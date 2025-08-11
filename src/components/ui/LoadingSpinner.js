"use client";

import { cn } from '@/lib/utils';

export function LoadingSpinner({ className, size = 'md', ...props }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-[3px]',
  };

  return (
    <div 
      className={cn(
        'inline-block animate-spin rounded-full border-solid border-current border-r-transparent',
        sizes[size],
        className
      )}
      role="status"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingBlock({ className, ...props }) {
  return (
    <div 
      className={cn(
        'flex items-center justify-center p-8',
        className
      )}
      {...props}
    >
      <LoadingSpinner size="md" className="text-[var(--accent)]" />
    </div>
  );
}
