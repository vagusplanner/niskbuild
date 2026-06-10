export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted: boolean;
  tier: string | null;
  /** Opens mailto instead of Stripe checkout */
  contactSales?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Sandbox',
    price: '$0',
    period: '/month',
    description: 'Preview playground — phone verified',
    features: ['1 project', '1 session', 'Local AI preview', 'ZIP export locked'],
    buttonText: 'Get Started Free',
    highlighted: false,
    tier: null,
  },
  {
    name: 'Builder Pro',
    price: '$69',
    period: '/month',
    description: 'For professional freelancers',
    features: ['5 projects', '2 sessions', '600 cloud credits', 'Clean ZIP export', 'No BYOC'],
    buttonText: 'Upgrade to Pro',
    highlighted: false,
    tier: 'pro',
  },
  {
    name: 'Agency Studio',
    price: '$199',
    period: '/month',
    description: 'For growing agencies',
    features: ['15 projects', '3 sessions', '2,500 credits', 'BYOC included', 'Deploy + preview links'],
    buttonText: 'Upgrade to Agency',
    highlighted: true,
    tier: 'agency',
  },
  {
    name: 'Agency Scale',
    price: '$549',
    period: '/month',
    description: 'For high-volume teams',
    features: ['Unlimited projects', '10 sessions', '10,000 credits', 'BYOC', 'Priority AI queue'],
    buttonText: 'Upgrade to Scale',
    highlighted: false,
    tier: 'scale',
  },
  {
    name: 'White-Label',
    price: '$1,199',
    period: '/month',
    description: 'For resellers',
    features: ['Unlimited projects', 'Unlimited sessions', '15,000 credits', 'Full rebrand', 'BYOC'],
    buttonText: 'Contact Sales',
    highlighted: false,
    tier: 'white_label',
    contactSales: true,
  },
  {
    name: 'Sovereign',
    price: '$2,499',
    period: '/month',
    description: 'Enterprise & compliance',
    features: ['Unlimited everything', '50,000 credits', 'Custom SLA', 'Dedicated support', 'BYOC'],
    buttonText: 'Contact Sales',
    highlighted: false,
    tier: 'sovereign',
    contactSales: true,
  },
];

export const PRICING_FAQ = [
  {
    q: 'Do I own my code?',
    a: 'Yes, completely. When you export your project, you get the full source code with no watermarks, no lock-in, and no hidden fees.',
  },
  {
    q: 'Why is BYOC only on Agency+?',
    a: 'Bring-your-own API keys on Pro would let users pay once and build forever without credits. Agency+ unlocks BYOC for teams that need it.',
  },
  {
    q: 'How do reload packs work?',
    a: 'Top up credits anytime. Packs are priced higher per-credit than your subscription to make upgrading the smarter choice.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts. Your exported code stays yours forever.',
  },
  {
    q: 'Is my data private?',
    a: 'Your code stays yours. Anonymous macro telemetry is opt-out in Settings.',
  },
];
