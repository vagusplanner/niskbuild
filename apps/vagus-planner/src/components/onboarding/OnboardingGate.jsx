/**
 * Single post-consent welcome gate for Vagus Planner.
 *
 * Sequence (enforced):
 *   1. LegalConsentFlow must be complete (Layout)
 *   2. Then WelcomeQuestionnaire (location + preferences) once
 *
 * InteractiveOnboarding tour is retired — its essential “getting around” tips
 * live in ImprovedOnboardingResults. One tracking key:
 *   localStorage onboarding_completed_<email> + settings.onboarding_completed
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import WelcomeQuestionnaire from './WelcomeQuestionnaire';
import { isStaticBundleContext } from '@/lib/static-bundle';
import {
  hasCompletedLegalConsent,
  parseConsentsFromSettings,
  readLocalConsentMirror,
} from '@/lib/gdpr-consent';
import {
  isOnboardingSeenLocally,
  markOnboardingSeenLocally,
  persistOnboardingCompleted,
} from '@/lib/vp-onboarding-seen';

function isLandingPath() {
  const path = window.location.pathname || '';
  return path === '/' || path === '/Landing' || path.endsWith('/Landing');
}

function consentCompleteForUser(email, settings) {
  if (!email) return false;
  const mirror = readLocalConsentMirror(email);
  if (mirror && hasCompletedLegalConsent(mirror)) return true;
  return hasCompletedLegalConsent(parseConsentsFromSettings(settings));
}

export default function OnboardingGate({ children }) {
  const [showWelcome, setShowWelcome] = useState(false);
  const persistStartedRef = useRef(false);
  const settingsRef = useRef(null);
  const queryClient = useQueryClient();
  const staticBundle = isStaticBundleContext();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !staticBundle,
    retry: false,
  });

  const { data: settingsList, isLoading: settingsLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const list = await base44.entities.UserSettings.list();
      return list ?? [];
    },
    enabled: !!user?.email && !staticBundle,
  });

  const settings = settingsList?.[0] ?? null;

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const markWelcomeDone = useCallback(async () => {
    if (!user?.email || persistStartedRef.current) return;
    persistStartedRef.current = true;
    markOnboardingSeenLocally(user.email);
    await persistOnboardingCompleted({ email: user.email, settings: settingsRef.current });
    queryClient.invalidateQueries({ queryKey: ['userSettings'] });
  }, [user?.email, queryClient]);

  const tryShowWelcome = useCallback(() => {
    if (staticBundle || isLandingPath()) return;
    if (!user?.email || settingsLoading) return;

    if (!consentCompleteForUser(user.email, settings)) {
      setShowWelcome(false);
      return;
    }

    // Already completed — do not open. Leave showWelcome alone if this session already
    // opened (we mark localStorage on open, which would otherwise immediately close it).
    if (settings?.onboarding_completed || isOnboardingSeenLocally(user.email)) {
      return;
    }

    // Consent done + welcome not done → show once. Mark localStorage immediately so a
    // refresh mid-flow does not re-open after Legal.
    markOnboardingSeenLocally(user.email);
    setShowWelcome(true);
  }, [staticBundle, user?.email, settings, settingsLoading]);

  useEffect(() => {
    tryShowWelcome();
  }, [tryShowWelcome]);

  // LegalConsentFlow save completes → Layout invalidates userSettings; also listen for
  // an explicit event so we open Welcome without waiting on a racey refetch.
  useEffect(() => {
    const onConsentSaved = () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      // Next tick after invalidate — tryShowWelcome runs when settings update;
      // also attempt immediately using local mirror which saveGdprConsents already wrote.
      setTimeout(() => tryShowWelcome(), 50);
    };
    window.addEventListener('vp_legal_consent_saved', onConsentSaved);
    return () => window.removeEventListener('vp_legal_consent_saved', onConsentSaved);
  }, [queryClient, tryShowWelcome]);

  useEffect(() => {
    if (!showWelcome) return undefined;
    return () => {
      void markWelcomeDone();
    };
  }, [showWelcome, markWelcomeDone]);

  const handleWelcomeFinished = async () => {
    setShowWelcome(false);
    await markWelcomeDone();
  };

  return (
    <>
      {children}
      {showWelcome && user && (
        <WelcomeQuestionnaire
          user={user}
          onComplete={handleWelcomeFinished}
          onSkip={handleWelcomeFinished}
        />
      )}
    </>
  );
}
