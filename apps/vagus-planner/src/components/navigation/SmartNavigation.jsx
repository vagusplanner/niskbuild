/**
 * Smart Navigation Registry
 * Maps deep links to avoid redundant buttons/tabs
 * Example: All "Goals" buttons → /Goals (not Profile → Goals or Islam → Goals)
 */

export const NAVIGATION_MAP = {
  // Main Pages
  'dashboard': '/Dashboard',
  'calendar': '/Calendar',
  'islam': '/Islam',
  'goals': '/Goals',
  'wellness': '/Wellness',
  'account': '/Account',

  // Consolidated Deep Links (avoid duplicates)
  'profile': '/Account#profile',
  'settings': '/Account#settings',
  'billing': '/Account#billing',
  'notifications': '/Account#settings',

  // Islamic Edition Features (in Islam page)
  'prayer': '/Islam?section=prayer',
  'quran': '/Islam?section=quran',
  'zakat': '/Islam?section=zakat',
  'sadaqah': '/Islam?section=zakat',
  'hajj': '/Islam?section=prayer',
  'ramadan': '/Islam',
  'family': '/Islam',

  // Admin Pages (hidden from nav in v1 — routes still exist)
  'admin': '/Admin',
  'feedback': '/FeedbackManagement',
  'version-history': '/VersionHistory',
};

export const QUICK_ACTIONS = [
  { label: 'New Event', icon: 'Calendar', link: '/Calendar', shortcut: 'E' },
  { label: 'New Goal', icon: 'Target', link: '/Goals', shortcut: 'G' },
  { label: 'New Task', icon: 'CheckSquare', link: '/Calendar?tab=tasks', shortcut: 'T' },
  { label: 'Wellness', icon: 'Heart', link: '/Wellness', shortcut: 'W' },
  { label: 'Settings', icon: 'Settings', link: '/Account#settings', shortcut: 'S' },
];

/**
 * Navigate helper — always use NAVIGATION_MAP for consistency
 */
export const navigateTo = (key, router) => {
  const link = NAVIGATION_MAP[key];
  if (!link) {
    console.warn(`Unknown navigation key: ${key}`);
    return;
  }
  router(link);
};
