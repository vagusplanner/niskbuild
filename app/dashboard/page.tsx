"use client";

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';

// Inner component that uses useSearchParams
function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      setIsSuccess(true);
      setMessage('Payment successful! Your account has been upgraded to Pro.');
      
      getSafeSession();
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            router.push('/builder');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (canceled === 'true') {
      setMessage('Payment was canceled.');
      setTimeout(() => router.push('/pricing'), 3000);
    } else {
      router.push('/builder');
    }
  }, [searchParams, router]);

  if (!message) {
    return (
      <Layout showFooter={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[var(--secondary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-nisk-muted">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-md w-full bg-nisk-card rounded-xl border border-nisk p-8 text-center">
        {isSuccess ? (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-emerald-400 mb-4">Upgrade Successful!</h1>
            <p className="text-gray-300 mb-6">{message}</p>
            <p className="text-gray-500 text-sm">Redirecting in {countdown} seconds...</p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">😞</div>
            <h1 className="text-2xl font-bold text-red-400 mb-4">Payment Canceled</h1>
            <p className="text-gray-300 mb-6">{message}</p>
            <p className="text-gray-500 text-sm">Redirecting...</p>
          </>
        )}
      </div>
      </div>
    </Layout>
  );
}

// Wrap the content in a Suspense boundary
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <Layout showFooter={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[var(--secondary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-nisk-muted">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    }>
      <DashboardContent />
    </Suspense>
  );
}
