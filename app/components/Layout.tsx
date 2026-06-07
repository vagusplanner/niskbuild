"use client";

import AppMenu from './AppMenu';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  variant?: 'builder' | 'app';
  showAuth?: boolean;
  showFooter?: boolean;
}

export default function Layout({
  children,
  variant = 'app',
  showAuth = true,
  showFooter = true,
}: LayoutProps) {
  if (variant === 'builder') {
    return (
      <div className="h-screen overflow-hidden bg-nisk">
        <AppMenu variant="builder" showAuth={false} />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nisk flex flex-col">
      <AppMenu variant="app" showAuth={showAuth} />
      <main className="flex-1 pt-16 px-4 pb-8">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
