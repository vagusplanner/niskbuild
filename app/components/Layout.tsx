"use client";

import NavBar from './NavBar';
import Footer from './Footer';
import HelpAssistant from './HelpAssistant';

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
      <div data-builder-shell className="h-screen overflow-hidden bg-[var(--background)] flex flex-col">
        <NavBar variant="builder" />
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nisk flex flex-col">
      <NavBar variant={navVariant} />
      <main className="flex-1 pt-14 px-4 pb-8 max-w-[1600px] w-full mx-auto">
        {children}
      </main>
      {showFooter && variant !== 'marketing' && <Footer />}
      {variant === 'app' && <HelpAssistant mode="user" />}
    </div>
  );
}
