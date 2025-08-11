"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/me');
      
      if (res.status === 401) {
        // Try to refresh token
        const refreshRes = await fetch('/api/auth/refresh', { 
          method: 'POST',
          credentials: 'include' // Ensure cookies are sent
        });
        
        if (refreshRes.ok) {
          // If refresh was successful, try getting user again
          const userRes = await fetch('/api/me');
          if (userRes.ok) {
            const data = await userRes.json();
            setUser(data.user);
            return true;
          }
        }
        // If we get here, authentication failed
        setUser(null);
        return false;
      } 
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      }
      
      setUser(null);
      return false;
    } catch (error) {
      console.error('Auth error:', error);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return; // Avoid duplicate fetch in React Strict Mode (dev)
    hasFetched.current = true;
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      if (res.ok) {
        // After successful login, fetch user data
        await fetchUser();
        return { success: true };
      }
      
      const error = await res.json().catch(() => ({}));
      return { success: false, error: error.error || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated: !!user,
      login,
      logout, 
      refresh: fetchUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
