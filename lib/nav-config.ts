export interface NavItem {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

/** Subscriber workspace — own projects & builds */
export const WORKSPACE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', description: 'Overview & stats' },
  { href: '/builder', label: 'Builder', icon: '⚡', description: 'AI workspace' },
  { href: '/projects', label: 'My Projects', icon: '📁', description: 'All saved projects' },
  { href: '/deployments', label: 'Deployments', icon: '🚀', description: 'Live previews' },
];

/** Discover — marketplace & templates (no first-party apps here) */
export const DISCOVER_NAV: NavItem[] = [
  { href: '/marketplace', label: 'Marketplace', icon: '🏪', description: 'Apps & templates' },
  { href: '/templates/games', label: 'Templates', icon: '📋', description: 'Starter kits' },
];

/** Account & support */
export const APP_NAV: NavItem[] = [
  { href: '/dashboard/support', label: 'Support', icon: '💬', description: 'Help & tickets' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️', description: 'Billing & keys' },
  { href: '/pricing', label: 'Pricing', icon: '💳', description: 'Plans' },
];

/** Flat list for command palette / legacy */
export const MAIN_NAV: NavItem[] = [...WORKSPACE_NAV, ...DISCOVER_NAV, ...APP_NAV];

export const PUBLIC_NAV: NavItem[] = [
  { href: '/landing', label: 'Home', icon: '🏠' },
  { href: '/pricing', label: 'Pricing', icon: '💳' },
  { href: '/login', label: 'Sign In', icon: '🔐' },
];
