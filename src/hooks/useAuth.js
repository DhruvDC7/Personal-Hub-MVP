"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/ui';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(false);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    if (!isMounted.current) return false;
    
    try {
      setLoading(true);
      const res = await fetch('/api/me', { credentials: 'include' });
      
      if (res.status === 401) {
        // Try to refresh token
        const refreshRes = await fetch('/api/auth/refresh', { 
          method: 'POST',
          credentials: 'include'
        });
        
        if (refreshRes.ok) {
          // If refresh was successful, try getting user again
          const userRes = await fetch('/api/me', { credentials: 'include' });
          if (userRes.ok) {
            const data = await userRes.json();
            if (isMounted.current) {
              setUser(data.user);
            }
            return true;
          }
        }
        // If we get here, authentication failed
        if (isMounted.current) {
          setUser(null);
        }
        return false;
      } 
      
      if (res.ok) {
        const data = await res.json();
        if (isMounted.current) {
          setUser(data.user);
        }
        return true;
      }
      
      if (isMounted.current) {
        setUser(null);
      }
      return false;
    } catch (error) {
      console.error('Auth error:', error);
      if (isMounted.current) {
        setUser(null);
      }
      return false;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    
    // Initial fetch
    if (isMounted.current) {
      fetchUser();
    }

    return () => {
      isMounted.current = false;
    };
  }, [fetchUser]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (isMounted.current) {
          setUser(data.user);
          showToast({ type: 'success', message: 'Logged in successfully' });
        }
        return { success: true };
      }
      const error = await res.json().catch(() => ({}));
      const errorMessage = error.message || 'Invalid credentials';
      showToast({ type: 'error', message: errorMessage });
      return { 
        success: false, 
        error: errorMessage
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'An error occurred during login' 
      };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      });
      showToast({ type: 'success', message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      showToast({ type: 'error', message: 'Failed to logout' });
    } finally {
      if (isMounted.current) {
        setUser(null);
        router.push('/login');
      }
    }
  };

  const refreshUser = async () => {
    return fetchUser();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
