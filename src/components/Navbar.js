"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Accounts', path: '/accounts' },
    { name: 'Transactions', path: '/transactions' },
    { name: 'Documents', path: '/documents' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-sky-400">Personal Hub</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${
                    pathname === item.path
                      ? 'border-sky-400 text-sky-400'
                      : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-50'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-slate-400 text-sm">{user.email}</span>
                <button onClick={logout} className="text-slate-400 hover:text-slate-50 text-sm">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-400 hover:text-slate-50 text-sm">Login</Link>
                <Link href="/register" className="text-slate-400 hover:text-slate-50 text-sm">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
