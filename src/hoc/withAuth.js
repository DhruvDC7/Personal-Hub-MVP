'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function withAuth(Component) {
  return function ProtectedRoute({ ...props }) {
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const res = await fetch('/api/auth/me');
          if (!res.ok) {
            router.push('/login');
          }
        } catch (error) {
          router.push('/login');
        }
      };

      checkAuth();
    }, [router]);

    return <Component {...props} />;
  };
}
