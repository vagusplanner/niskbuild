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
  'connect': '/Connect',
  'account': '/Account',

  // Consolidated Deep Links (avoid duplicates)
  'profile': '/Account#profile',
  'settings': '/Account#settings',
  'billing': '/Account#billing',
  'notifications': '/Notifications',

  // Islamic Edition Features (in Islam page)
  'prayer': '/Islam?tab=prayer',
  'quran': '/Islam?tab=quran',
  'hajj': '/HajjUmrahDashboard',
  'ramadan': '/Islam?tab=ramadan',
  'zakat': '/ZakatCalculator',
  'family': '/FamilyHub',

  // Admin Pages
  'admin': '/Admin',
  'feedback': '/FeedbackManagement',
  'version-history': '/VersionHistory',
};

export const QUICK_ACTIONS = [
  { label: 'New Event', icon: 'Calendar', link: '/Calendar', shortcut: 'E' },
  { label: 'New Goal', icon: 'Target', link: '/Goals', shortcut: 'G' },
  { label: 'New Task', icon: 'CheckSquare', link: '/Calendar?tab=tasks', shortcut: 'T' },
  { label: 'New Chat', icon: 'MessageCircle', link: '/Connect', shortcut: 'C' },
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