"use client";

import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/me');
      if (res.status === 401) {
        const r = await fetch('/api/auth/refresh', { method: 'POST' });
        if (r.ok) {
          const res2 = await fetch('/api/me');
          if (res2.ok) {
            const data2 = await res2.json();
            setUser(data2.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return { user, loading, refresh: fetchUser, logout };
}
