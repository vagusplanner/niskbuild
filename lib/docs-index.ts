export type DocsIndexEntry = {
  id: string;
  title: string;
  section: string;
  href: string;
  keywords: string[];
};

export const DOCS_INDEX: DocsIndexEntry[] = [
  {
    id: 'pwa',
    title: 'Progressive Web Apps (PWA)',
    section: 'Mobile',
    href: '/docs/pwa',
    keywords: ['pwa', 'mobile', 'install', 'home screen', 'android', 'iphone'],
  },
  {
    id: 'google-import',
    title: 'Google Places Import',
    section: 'Builder',
    href: '/docs/google-import',
    keywords: ['google', 'places', 'business', 'import', 'local'],
  },
  {
    id: 'builder',
    title: 'AI Builder Workspace',
    section: 'Getting Started',
    href: '/builder',
    keywords: ['builder', 'generate', 'prompt', 'preview', 'code'],
  },
  {
    id: 'marketplace',
    title: 'Template Marketplace',
    section: 'Templates',
    href: '/marketplace',
    keywords: ['templates', 'marketplace', 'starter', 'crm'],
  },
  {
    id: 'pricing',
    title: 'Plans & Billing',
    section: 'Account',
    href: '/pricing',
    keywords: ['pricing', 'billing', 'credits', 'upgrade', 'pro', 'agency'],
  },
  {
    id: 'settings',
    title: 'Settings & Security',
    section: 'Account',
    href: '/dashboard/settings',
    keywords: ['settings', 'profile', 'password', 'security', 'api keys'],
  },
];
