"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  onLock?: () => void;
}

export default function SubscriptionGuard({ children, onLock }: SubscriptionGuardProps) {
  const [isActive, setIsActive] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [showWarning, setShowWarning] = useState(false);
  const [minutesUntilLock, setMinutesUntilLock] = useState(60);

  // Check subscription status
  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not logged in - don't lock, just return
        setIsActive(true);
        setIsChecking(false);
        return;
      }

      // Get user's subscription from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_end_date')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        // Don't lock on error - assume active
        setIsActive(true);
      } else {
        // Check if subscription is active
        const isSubscriptionActive = 
          profile?.subscription_status === 'active' ||
          profile?.subscription_tier === 'pro' ||
          profile?.subscription_tier === 'agency' ||
          profile?.subscription_tier === 'scale' ||
          profile?.subscription_tier === 'white_label';
        
        setIsActive(isSubscriptionActive);
        
        if (!isSubscriptionActive) {
          console.log('⚠️ Subscription inactive - workspace will lock');
          onLock?.();
        }
      }
    } catch (err) {
      console.error('Subscription check error:', err);
      // Don't lock on error
      setIsActive(true);
    } finally {
      setIsChecking(false);
      setLastCheck(new Date());
    }
  };

  // Calculate time until next check
  useEffect(() => {
    if (!isChecking && !isActive) {
      const timeSinceLastCheck = (Date.now() - lastCheck.getTime()) / 1000 / 60;
      const remaining = Math.max(0, 60 - timeSinceLastCheck);
      setMinutesUntilLock(Math.floor(remaining));
      
      if (remaining <= 5 && remaining > 0) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }
  }, [lastCheck, isActive, isChecking]);

  // Initial check and set up interval
  useEffect(() => {
    // Initial check
    checkSubscription();
    
    // Set up interval to check every 60 minutes
    const interval = setInterval(() => {
      checkSubscription();
    }, 60 * 60 * 1000); // 60 minutes
    
    // Also check when tab becomes visible again (user returns after being away)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSubscription();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying license...</p>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-3">Subscription Required</h2>
          <p className="text-gray-400 mb-6">
            Your NiskBuild subscription is no longer active. To continue building and exporting apps, please reactivate your plan.
          </p>
          {showWarning && minutesUntilLock > 0 && (
            <p className="text-yellow-500 text-sm mb-4">
              ⚠️ Workspace will lock in {minutesUntilLock} minutes if not reactivated.
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = '/pricing'}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              View Plans
            </button>
            <button
              onClick={() => window.location.href = '/settings/billing'}
              className="px-6 py-2 border border-gray-700 hover:border-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              Manage Billing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}