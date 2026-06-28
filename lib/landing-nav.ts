export const LANDING_SECTIONS = [
  { id: 'try-it-now', label: 'Demo' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'templates', label: 'Templates' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
] as const;

/** Single marketing nav — section anchors + pricing (no duplicate sticky bar). */
export const MARKETING_NAV = LANDING_SECTIONS.map((s) => ({
  href: s.id === 'pricing' ? '/pricing' : `/landing#${s.id}`,
  label: s.label,
}));

export const FOOTER_LINKS = [
  { href: '/builder', label: 'Builder' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/brand', label: 'Brand kit' },
  { href: '/docs', label: 'Docs' },
  { href: '/landing#contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];
