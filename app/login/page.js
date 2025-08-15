"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      let result;
      if (mode === 'login') {
        // Name should not be mandatory for login
        result = await login(name || undefined, email, password);
      } else {
        // Sign Up requires name
        result = await register(name, email, password);
      }
      const { success, error: opError } = result || {};
      if (!success) throw new Error(opError || 'Authentication failed');
      
      // The auth state change will trigger the redirect in the useEffect
    } catch (err) {
      setError(err.message || 'Authentication failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">Welcome to Personal Hub</h1>
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`px-4 py-2 rounded-lg border ${mode === 'login' ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'bg-transparent text-white border-[var(--border)]'}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`px-4 py-2 rounded-lg border ${mode === 'signup' ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'bg-transparent text-white border-[var(--border)]'}`}
        >
          Sign Up
        </button>
      </div>
      <p className="text-xs text-[var(--muted)] mb-6 text-center">
        <span className="text-red-500">*</span> indicates a mandatory field
      </p>
      
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'signup' && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--muted)] mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--input)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
              required
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--muted)] mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--input)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--muted)] mb-2">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--input)] border border-[var(--border)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-colors"
            required
          />
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          className="w-full"
        >
          {isLoading ? (mode === 'login' ? 'Signing in...' : 'Signing up...') : (mode === 'login' ? 'Sign In' : 'Sign Up')}
        </Button>
      </form>
    </div>
  );
}
