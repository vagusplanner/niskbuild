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
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');

  // Check subscription status
  const checkSubscription = async () => {
    console.log('🔍 [License Heartbeat] Checking subscription status...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('🔍 [License Heartbeat] No user session - skipping check');
        setIsActive(true);
        setIsChecking(false);
        return;
      }

      console.log('🔍 [License Heartbeat] User session found, verifying subscription...');

      // Try to get subscription status from API
      try {
        const response = await fetch('/api/subscription/status', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ [License Heartbeat] Subscription status:', data);
          setIsActive(data.active !== false);
          setSubscriptionTier(data.tier || 'free');
        } else {
          console.warn('⚠️ [License Heartbeat] API error, assuming active');
          setIsActive(true);
        }
      } catch (apiError) {
        console.warn('⚠️ [License Heartbeat] API fetch error, assuming active:', apiError);
        setIsActive(true);
      }
    } catch (err) {
      console.error('❌ [License Heartbeat] Check error:', err);
      setIsActive(true);
    } finally {
      setIsChecking(false);
      setLastCheck(new Date());
      console.log(`🔒 [License Heartbeat] Next check in 60 minutes. Status: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
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
    console.log('🔒 [License Heartbeat] Initializing license heartbeat system...');
    
    // Initial check
    checkSubscription();
    
    // Set up interval to check every 60 minutes
    const interval = setInterval(() => {
      console.log('⏰ [License Heartbeat] 60-minute check triggered');
      checkSubscription();
    }, 60 * 60 * 1000); // 60 minutes
    
    // Also check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [License Heartbeat] Tab became visible, checking subscription...');
        checkSubscription();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    console.log('✅ [License Heartbeat] System initialized - checking every 60 minutes');
    
    return () => {
      console.log('🔒 [License Heartbeat] Shutting down...');
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
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-8">
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

  const isPaidUser = subscriptionTier !== 'free';
  
  return (
    <>
      {isPaidUser && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 backdrop-blur-sm">
            <span className="text-emerald-400 text-xs">
              ⚡ {subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)} Plan Active
            </span>
          </div>
        </div>
      )}
      {children}
    </>
  );
}