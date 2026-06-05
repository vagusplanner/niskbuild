"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
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
      setMessage('✅ Payment successful! Your account has been upgraded to Pro.');
      
      const refreshSession = async () => {
        await supabase.auth.refreshSession();
      };
      refreshSession();
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          i(prev <= 1) {
                              rval);
            router.push('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (canceled === 'true') {
      setMessage('❌ Payment was canceled.');
      setTimeout(() => router.push('/pricing'), 3000);
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  if (!message) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
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
  );
}
