"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAvatar } from '@/hooks/useAvatar';

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { avatarUrl } = useAvatar(user);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Accounts', path: '/accounts' },
    { name: 'Transactions', path: '/transactions' },
    { name: 'Documents', path: '/documents' },
  ];
  // Avatar is managed and cached by useAvatar
  
  // Sliding indicator state and refs
  const containerRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!user) return; // nav hidden when logged out
    const container = containerRef.current;
    if (!container) return;

    const activeKey = navItems.find(i => i.path === pathname)?.path ?? navItems[0]?.path;
    const activeEl = container.querySelector(`[data-path="${activeKey}"]`);
    if (!activeEl) return;

    const parentRect = container.getBoundingClientRect();
    const rect = activeEl.getBoundingClientRect();
    setIndicator({ left: rect.left - parentRect.left, width: rect.width });
  }, [pathname, user]);

  // Recompute on resize to keep indicator aligned
  useEffect(() => {
    function handleResize() {
      if (!user) return;
      const container = containerRef.current;
      if (!container) return;
      const activeKey = navItems.find(i => i.path === pathname)?.path ?? navItems[0]?.path;
      const activeEl = container.querySelector(`[data-path="${activeKey}"]`);
      if (!activeEl) return;
      const parentRect = container.getBoundingClientRect();
      const rect = activeEl.getBoundingClientRect();
      setIndicator({ left: rect.left - parentRect.left, width: rect.width });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pathname, user]);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-[var(--card)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                Personal Hub
              </Link>
            </div>
            {user && (
              <div
                ref={containerRef}
                className="relative hidden sm:ml-8 sm:flex sm:gap-2 rounded-xl bg-[var(--card)]/50 p-1"
              >
                {/* Sliding indicator pill */}
                <span
                  className="absolute top-1 bottom-1 left-0 rounded-lg bg-[var(--border)]/40 backdrop-blur-sm transition-all duration-300 ease-out"
                  style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
                />
                {navItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      data-path={item.path}
                      className={`relative z-10 inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'text-white' : 'text-[var(--muted)] hover:text-white'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center">
            {user ? (
              <Link 
                href="/profile"
                className={`flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 cursor-pointer p-1 transition-colors ${
                  pathname?.startsWith('/profile')
                    ? 'bg-slate-700 ring-2 ring-[var(--accent)] text-white'
                    : 'hover:bg-slate-700 focus:ring-white'
                }`}
              >
                <span className="sr-only">Open user profile</span>
                {avatarUrl ? (
                  <div className="relative h-8 w-8 rounded-full overflow-hidden">
                    <Image
                      src={avatarUrl}
                      alt="User avatar"
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
            ) : (
              <Link 
                href="/login" 
                className="text-slate-400 hover:text-slate-50 text-sm px-3 py-2 rounded-md hover:bg-slate-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
