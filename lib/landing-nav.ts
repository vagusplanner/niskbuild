/** Section anchors for the legacy /landing page (LandingSectionNav). */
export const LANDING_SECTIONS = [
  { id: 'try-it-now', label: 'Demo' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'templates', label: 'Templates' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
] as const;

/**
 * Marketing top nav — points at /landing-v2 sections (homepage) plus /pricing.
 * FAQ + Contact live on /landing-v2 so #contact / #faq anchors resolve there.
 */
export const MARKETING_NAV = [
  { href: '/landing-v2#difference', label: 'Why us' },
  { href: '/landing-v2#how-it-works', label: 'How it works' },
  { href: '/landing-v2#plans', label: 'Plans' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/landing-v2#faq', label: 'FAQ' },
  { href: '/landing-v2#contact', label: 'Contact' },
] as const;

export const FOOTER_LINKS = [
  { href: '/builder', label: 'Builder' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/brand', label: 'Brand kit' },
  { href: '/docs', label: 'Docs' },
  { href: '/landing-v2#contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];
