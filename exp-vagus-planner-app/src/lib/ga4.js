/**
 * GA4 analytics helper.
 * Replace G-PLACEHOLDER in index.html with your real Measurement ID.
 * All events are no-ops until gtag is loaded.
 */

function gtag(...args) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

/**
 * Track a page view. Call on route changes.
 * @param {string} path  e.g. '/FamilyHub'
 * @param {string} title Page title
 */
export function trackPageView(path, title) {
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
  });
}

/**
 * Track a named event with optional parameters.
 * @param {string} eventName  snake_case event name
 * @param {object} params     optional key/value pairs
 */
export function trackEvent(eventName, params = {}) {
  gtag('event', eventName, params);
}

// ── Predefined semantic events ─────────────────────────────────────────────

export const GA = {
  // Onboarding
  onboardingStart: () => trackEvent('onboarding_start'),
  onboardingStep: (step) => trackEvent('onboarding_step', { step }),
  onboardingComplete: (interests) => trackEvent('onboarding_complete', { interests: interests.join(',') }),

  // Family Hub
  familyCreated: () => trackEvent('family_created'),
  familyJoined: () => trackEvent('family_joined'),
  familyPrayerGoalCreated: () => trackEvent('family_prayer_goal_created'),
  familyPrayerLogged: () => trackEvent('family_prayer_logged'),
  familyHajjPlanSaved: () => trackEvent('family_hajj_plan_saved'),
  familyContributionLogged: (type, amount) => trackEvent('family_contribution_logged', { type, value: amount }),

  // Prayer
  prayerLogged: (prayer) => trackEvent('prayer_logged', { prayer }),
  adhanPlayed: () => trackEvent('adhan_played'),

  // Quran
  quranReadingLogged: (pages) => trackEvent('quran_reading_logged', { pages }),
  quranGoalSet: () => trackEvent('quran_goal_set'),

  // Billing
  upgradeClicked: (from_page) => trackEvent('upgrade_clicked', { from_page }),
  subscriptionStarted: (plan) => trackEvent('subscription_started', { plan }),

  // General
  featureUsed: (feature) => trackEvent('feature_used', { feature }),
};