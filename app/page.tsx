"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the builder page
    router.push('/builder');
  }, [router]);
  
  // Show a simple loading spinner while redirecting
  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#4F6EF7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading NiskBuild...</p>
      </div>
    </div>
  );
}