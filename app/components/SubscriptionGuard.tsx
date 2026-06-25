"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PAID_TIERS } from '@/lib/access';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  onLock?: () => void;
}

function isPaidActive(data: { tier?: string; status?: string; paid?: boolean; active?: boolean }) {
  const tier = data.tier || 'free';
  return (
    PAID_TIERS.includes(tier as (typeof PAID_TIERS)[number]) &&
    data.status === 'active' &&
    data.paid === true &&
    data.active === true
  );
}

function canAccessBuilder(data: { tier?: string; status?: string; paid?: boolean; active?: boolean }) {
  const tier = data.tier || 'free';
  if (tier === 'free') return true;
  return isPaidActive(data);
}

export default function SubscriptionGuard({ children, onLock }: SubscriptionGuardProps) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkSubscription = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setHasAccess(false);
        setIsChecking(false);
        onLock?.();
        return;
      }

      const response = await fetch('/api/subscription/status', {
        credentials: 'include',
      });

      if (!response.ok) {
        setHasAccess(false);
        onLock?.();
        return;
      }

      const data = await response.json();
      const access = canAccessBuilder(data);
      setHasAccess(access);

      if (!access) onLock?.();
    } catch {
      setHasAccess(false);
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

  if (!hasAccess) {
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
      {children}
    </>
  );
}
