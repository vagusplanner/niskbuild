export interface NavItem {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

export const MAIN_NAV: NavItem[] = [
  { href: '/builder', label: 'Builder', icon: '⚡', description: 'AI workspace' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊', description: 'Projects & usage' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️', description: 'Billing & keys' },
  { href: '/templates/games', label: 'Games', icon: '🎮', description: 'Phaser.js templates' },
  { href: '/marketplace', label: 'Marketplace', icon: '🏪', description: 'Templates' },
  { href: '/pricing', label: 'Pricing', icon: '💳', description: 'Plans' },
];

export const PUBLIC_NAV: NavItem[] = [
  { href: '/landing', label: 'Home', icon: '🏠' },
  { href: '/pricing', label: 'Pricing', icon: '💳' },
  { href: '/login', label: 'Sign In', icon: '🔐' },
];
