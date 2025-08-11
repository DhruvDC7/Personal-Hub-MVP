"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Accounts', path: '/accounts' },
    { name: 'Transactions', path: '/transactions' },
    { name: 'Documents', path: '/documents' },
  ];
  
  

  return (
    <nav className="bg-[var(--card)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                Personal Hub
              </Link>
            </div>
            {user && (
              <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`${
                      pathname === item.path
                        ? 'border-[var(--accent)] text-white'
                        : 'border-transparent text-[var(--muted)] hover:text-white hover:border-[var(--border)]'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center">
            {user ? (
              <Link 
                href="/profile"
                className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white cursor-pointer hover:bg-slate-700 p-1 transition-colors"
              >
                <span className="sr-only">Open user profile</span>
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
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
