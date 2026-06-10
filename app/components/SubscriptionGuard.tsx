"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  onLock?: () => void;
}

const PAID_TIERS = ['pro', 'agency', 'scale', 'white_label'];

function isPaidActive(data: { tier?: string; status?: string; paid?: boolean; active?: boolean }) {
  const tier = data.tier || 'free';
  return (
    PAID_TIERS.includes(tier) &&
    data.status === 'active' &&
    data.paid === true &&
    data.active === true
  );
}

export default function SubscriptionGuard({ children, onLock }: SubscriptionGuardProps) {
  const [isActive, setIsActive] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');

  const checkSubscription = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setIsActive(false);
        setIsChecking(false);
        onLock?.();
        return;
      }

      const response = await fetch('/api/subscription/status', {
        credentials: 'include',
      });

      if (!response.ok) {
        setIsActive(false);
        onLock?.();
        return;
      }

      const data = await response.json();
      const active = isPaidActive(data);
      setIsActive(active);
      setSubscriptionTier(data.tier || 'free');

      if (!active) onLock?.();
    } catch {
      setIsActive(false);
      onLock?.();
    } finally {
      setIsChecking(false);
    }
  }, [onLock]);

  useEffect(() => {
    checkSubscription();

    const interval = setInterval(checkSubscription, 60 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkSubscription();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkSubscription]);

  if (isChecking) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-nisk">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-nisk-muted text-sm">Verifying license...</p>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen bg-nisk flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-3">Subscription Required</h2>
          <p className="text-nisk-muted mb-6">
            Your NiskBuild subscription is inactive or expired. Reactivate to continue building and
            exporting.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => {
                window.location.href = '/pricing';
              }}
              className="px-6 py-2 bg-gradient-brand text-white rounded-lg text-sm font-medium"
            >
              View Plans
            </button>
            <button
              onClick={() => {
                window.location.href = '/dashboard/settings';
              }}
              className="px-6 py-2 border border-nisk text-gray-300 rounded-lg text-sm hover:text-white"
            >
              Manage Billing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-[4.25rem] right-4 z-40 pointer-events-none hidden sm:block">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 backdrop-blur-sm">
          <span className="text-emerald-400 text-xs capitalize">
            {subscriptionTier.replace('_', ' ')} active
          </span>
        </div>
      </div>
      {children}
    </>
  );
}
