'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Error is already displayed to the user in the UI
  }, [error]);

  return (
    <div className="min-h-full px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div className="max-w-max mx-auto">
        <main className="sm:flex">
          <p className="text-4xl font-extrabold text-sky-400 sm:text-5xl">Oops!</p>
          <div className="sm:ml-6">
            <div className="sm:border-l sm:border-slate-700 sm:pl-6">
              <h1 className="text-4xl font-extrabold text-slate-50 tracking-tight sm:text-5xl">
                Something went wrong
              </h1>
              <p className="mt-1 text-base text-slate-400">
                {error.message || 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
            <div className="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
              <button
                onClick={() => reset()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-sky-400 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-0"
              >
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-slate-700 text-sm font-medium rounded-lg text-slate-50 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-0"
              >
                Go back home
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
