"use client";

import AppTopNav from './AppTopNav';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  variant?: 'builder' | 'app' | 'marketing';
  showAuth?: boolean;
  showFooter?: boolean;
}

export default function Layout({
  children,
  variant = 'app',
  showAuth = true,
  showFooter = true,
}: LayoutProps) {
  const navVariant = variant === 'marketing' ? 'marketing' : 'app';

  if (variant === 'builder') {
    return (
      <div className="h-screen overflow-hidden bg-nisk flex flex-col">
        <AppTopNav variant="app" />
        <div className="flex-1 min-h-0 pt-14">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nisk flex flex-col">
      <AppTopNav variant={navVariant} />
      <main className="flex-1 pt-14 px-4 pb-8 max-w-[1600px] w-full mx-auto">
        {children}
      </main>
      {showFooter && variant !== 'marketing' && <Footer />}
    </div>
  );
}
