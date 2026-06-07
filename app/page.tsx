"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/landing');
  }, [router]);

  return (
    <div className="min-h-screen bg-nisk flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-nisk-muted">Loading NiskBuild...</p>
      </div>
    </div>
  );
}
