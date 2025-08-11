"use client";

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Button = forwardRef(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      loadingText = '',
      as: Component = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-60 disabled:pointer-events-none transition-all';

    const variants = {
      primary:
        'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-red-500/20',
      outline:
        'border border-[var(--accent)] bg-transparent text-[var(--accent)] hover:bg-[var(--accent)]/10',
      ghost:
        'bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)]/10',
      danger:
        'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const buttonProps = {
      ref,
      className: cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      ),
      ...(Component === 'button' && { disabled: disabled || isLoading }),
      ...props
    };

    return (
      <Component {...buttonProps}>
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Component>
    );
  }
);

Button.displayName = 'Button';

export { Button };

export default Button;
