"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// Define types for user and session
interface User {
  id: string;
  email?: string;
}

interface Session {
  user: User | null;
}

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export default function Layout({ children, showSidebar = true }: LayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { href: '/builder', label: 'Builder', icon: '🔨' },
    { href: '/marketplace', label: 'Marketplace', icon: '🏪' },
    { href: '/pricing', label: 'Pricing', icon: '💳' },
  ];

  // Only show admin link for specific email
  if (user?.email === 'sofiane.kemih@gmail.com') {
    navItems.push({ href: '/admin/users', label: 'Admin', icon: '👑' });
  }

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#0B0F19]/95 backdrop-blur-sm border-b border-gray-800 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/builder" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#4F6EF7] to-[#7C3AED] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NB</span>
            </div>
            <span className="font-bold text-white hidden sm:inline">NiskBuild</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-sm"
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-gray-400 hidden sm:inline">{user.email?.split('@')[0]}</span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/landing"
              className="text-xs bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 px-3 py-1.5 rounded-full transition-colors"
            >
              Sign In / Sign Up
            </Link>
          )}
          <div className="text-xs font-mono text-gray-400 bg-gray-900/50 px-3 py-1 rounded-full hidden sm:block">
            🧠 M1 Node Memory: <span className="text-emerald-400">16GB</span>
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed top-14 left-0 right-0 bg-[#0B0F19] border-b border-gray-800 z-40 md:hidden">
          <div className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg"
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-14">
        {children}
      </main>
    </div>
  );
}