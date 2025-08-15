'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function withAuth(Component) {
  return function ProtectedRoute({ ...props }) {
    const router = useRouter();
    const [user, setUser] = useState(null);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const res = await fetch('/api/me', { cache: 'no-store' });
          if (!res.ok) {
            router.push('/login');
            return;
          }
          const data = await res.json();
          setUser(data?.user || null);
        } catch (error) {
          router.push('/login');
        }
      };

      checkAuth();
    }, [router]);

    return <Component {...props} user={user} />;
  };
}
