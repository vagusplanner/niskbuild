/**
 * App Store v1 navigation scoping.
 * Routes stay registered in App.jsx — only nav links are filtered here.
 * Remove a page from V1_HIDDEN_PAGES (or section sets below) to re-enable.
 */

export const V1_HIDDEN_PAGES = new Set([
  'Connect',
  'FamilyHub',
  'FamilyDashboard',
  'FamilyBudget',
  'HajjUmrahDashboard',
  'Islamic',
  'TravelPackingAssistant',
  'Gamification',
  'Health',
  'VoiceJournal',
  'Notifications',
  'Workflows',
  'MosqueCommunityCalendar',
  'ZakatDashboard',
  'IslamicFinance',
  'EmailCampaigns',
  'VersionHistory',
  'FeedbackManagement',
  'MealPlanner',
  'FitnessGoalDashboard',
  'Admin',
]);

/** Islam hub section tile ids hidden for v1 */
export const V1_HIDDEN_ISLAM_SECTION_IDS = new Set([
  'ramadan',
  'hajj',
  'family_hub',
  'hijri_calendar',
]);

/** Wellness → Health sub-section ids visible in v1 */
export const V1_HEALTH_VISIBLE_SECTIONS = new Set(['womens', 'coach']);

export function isPageHiddenFromNav(page) {
  if (!page) return false;
  return V1_HIDDEN_PAGES.has(page);
}

export function filterNavItems(items) {
  return items.filter((item) => !isPageHiddenFromNav(item.page));
}

export function shouldShowIslamSection(section) {
  if (V1_HIDDEN_ISLAM_SECTION_IDS.has(section.id)) return false;
  if (section.isLink && isPageHiddenFromNav(section.isLink)) return false;
  return true;
}

/** Onboarding deep-link targets on the Islam hub */
export const ONBOARDING_ISLAM_TARGETS = {
  zakat: '/Islam?section=zakat',
  sadaqah: '/Islam?section=zakat',
  hajj: '/Islam?section=prayer',
};

export function islamOnboardingUrl(interest) {
  return ONBOARDING_ISLAM_TARGETS[interest] || '/Islam';
}
