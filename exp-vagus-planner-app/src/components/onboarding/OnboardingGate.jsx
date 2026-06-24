import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import InteractiveOnboarding from './InteractiveOnboarding';

export default function OnboardingGate({ children }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: settings } = useQuery({
    queryKey: ['userSettings', user?.email],
    queryFn: async () => {
      const list = await SDK.entities.UserSettings.list();
      return list[0] || null;
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    // Only show on dashboard/authenticated pages, not landing
    const isLandingPage = window.location.pathname === '/' || window.location.pathname === '/Landing';
    if (isLandingPage) return;

    // Show onboarding only once when user first logs in and hasn't completed it
    if (user?.email && !settings?.onboarding_completed) {
      const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${user.email}`);
      if (!hasSeenOnboarding) {
        // Small delay so dashboard loads first
        const timer = setTimeout(() => {
          setShowOnboarding(true);
          localStorage.setItem(`onboarding_seen_${user.email}`, '1');
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user?.email, settings?.onboarding_completed]);

  const handleComplete = async () => {
    setShowOnboarding(false);
    if (user?.email && settings?.id) {
      try {
        await SDK.entities.UserSettings.update(settings.id, { onboarding_completed: true });
      } catch (_) {}
    }
  };

  return (
    <>
      {children}
      <InteractiveOnboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleComplete}
        showDontShowAgain={true}
      />
    </>
  );
}