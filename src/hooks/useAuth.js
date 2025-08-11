"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/ui';

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://personal-hub-mvp-backend.vercel.app';
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before token expiry

// Queue for handling concurrent requests during token refresh
let refreshPromise = null;
let refreshInProgress = false;

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  refreshToken: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(false);
  const router = useRouter();

  const refreshToken = useCallback(async () => {
    // If refresh is already in progress, return the existing promise
    if (refreshInProgress) {
      console.log('Token refresh already in progress, returning existing promise');
      return refreshPromise;
    }

    refreshInProgress = true;
    refreshPromise = new Promise(async (resolve, reject) => {
      try {
        console.log('Attempting to refresh token...');
        
        // Use relative path since we're using rewrites in next.config.js
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: 'Failed to refresh token. Please log in again.'
          }));
          
          const error = new Error(errorData.message || 'Failed to refresh token');
          error.status = response.status;
          throw error;
        }

        const data = await response.json();
        
        // Update the user state with new token data if available
        if (isMounted.current && data.user) {
          setUser(data.user);
        }
        
        resolve(data);
      } catch (error) {
        
        // Only redirect if we're still mounted
        if (isMounted.current) {
          setUser(null);
          showToast({ 
            type: 'error', 
            message: 'Your session has expired. Please log in again.' 
          });
          router.push('/login');
        }
        
        reject(error);
      } finally {
        refreshInProgress = false;
        refreshPromise = null;
      }
    });

    return refreshPromise;
  }, [router]);

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const fetchOptions = {
      ...options,
      credentials: 'include',
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
      mode: 'cors',
      cache: 'no-cache',
    };

    try {
      // Make the initial request
      let response = await fetch(url, fetchOptions);

      // If unauthorized, try to refresh token and retry once
      if (response.status === 401) {
        try {
          await refreshToken();
          
          // Retry the original request with fresh token
          response = await fetch(url, {
            ...fetchOptions,
            headers: {
              ...defaultHeaders,
              ...(options.headers || {}),
            },
          });
          
        } catch (refreshError) {
          if (isMounted.current) {
            setUser(null);
            showToast({ 
              type: 'error', 
              message: 'Your session has expired. Please log in again.' 
            });
            router.push('/login');
          }
          throw new Error('Session expired. Please log in again.');
        }
      }

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText || 'Request failed'
        }));
        
        const error = new Error(errorData.message || 'Request failed');
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      return response;
    } catch (error) {
      
      // Only show error toast if it's not an authentication error
      if (error.status !== 401 && isMounted.current) {
        showToast({
          type: 'error',
          message: error.message || 'Network error. Please try again.'
        });
      }
      
      throw error;
    }
  }, [refreshToken]);

  const fetchUser = useCallback(async () => {
    if (!isMounted.current) {
      return false;
    }
    
    try {
      setLoading(true);
      
      // Fetch user data using relative path
      const response = await fetch('/api/me', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      // Handle 401 Unauthorized with token refresh
      if (response.status === 401) {
        try {
          await refreshToken();
          // Retry the request after successful refresh
          return fetchUser();
        } catch (refreshError) {
          if (isMounted.current) {
            setUser(null);
          }
          return false;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (isMounted.current) {
          setUser(null);
        }
        return false;
      }

      const data = await response.json();
      
      if (isMounted.current) {
        setUser(data.user);
        
        // Schedule token refresh before it expires
        if (data.expiresAt) {
          const expiresIn = new Date(data.expiresAt).getTime() - Date.now() - REFRESH_THRESHOLD;
          if (expiresIn > 0) {
            setTimeout(() => {
              if (isMounted.current) {
                refreshToken().catch(err => {
                });
              }
            }, expiresIn);
          }
        }
      }
      
      return true;
    } catch (error) {
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
    if (!isMounted.current) {
      return { success: false, error: 'Component unmounted' };
    }

    try {
      setLoading(true);
      
      // Clear any existing user data
      setUser(null);
      
      // Make the login request using relative path
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({
        message: 'Invalid server response'
      }));

      if (!response.ok) {
        const errorMessage = data.message || 'Login failed. Please try again.';
        
        if (isMounted.current) {
          showToast({ 
            type: 'error',
            message: errorMessage
          });
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }

      // Login successful
      
      if (isMounted.current) {
        setUser(data.user);
        showToast({ 
          type: 'success', 
          message: 'Logged in successfully' 
        });
        
        // Schedule token refresh before it expires
        if (data.expiresAt) {
          const expiresIn = new Date(data.expiresAt).getTime() - Date.now() - REFRESH_THRESHOLD;
          if (expiresIn > 0) {
            setTimeout(() => {
              if (isMounted.current) {
                refreshToken().catch(err => {
                });
              }
            }, expiresIn);
          }
        }
      }
      
      return { 
        success: true,
        user: data.user
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to log in. Please try again.';
      showToast({ type: 'error', message: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const logout = async () => {
    try {
      await fetchWithAuth(`${API_BASE_URL}/api/auth/logout`, { 
        method: 'POST'
      });
      showToast({ type: 'success', message: 'Logged out successfully' });
    } catch (error) {
      showToast({ 
        type: 'error', 
        message: error.message || 'Failed to log out. You may have been logged out already.' 
      });
    } finally {
      if (isMounted.current) {
        setUser(null);
        router.push('/login');
      }
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      await refreshToken();
      return fetchUser();
    } catch (error) {
      return false;
    }
  }, [fetchUser, refreshToken]);

  // Expose the auth state and methods through context
  const contextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    refreshUser,
    refreshToken, // Expose refreshToken for manual refreshes if needed
    fetchWithAuth, // Expose fetchWithAuth for making authenticated API calls
  };

  return (
    <AuthContext.Provider value={contextValue}>
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
