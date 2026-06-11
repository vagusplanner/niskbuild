export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted: boolean;
  tier: string | null;
  /** Opens in-app sales form instead of Stripe checkout */
  contactSales?: boolean;
  /** Inbox that receives form submissions for contactSales tiers */
  contactEmail?: string;
}

export const SALES_EMAIL = 'hello@niskbuild.com';
export const ENTERPRISE_SALES_EMAIL = 'team@niskbuild.com';

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Sandbox',
    price: '$0',
    period: '/month',
    description: 'Try before you buy',
    features: [
      '1 project',
      'Live preview',
      'Local AI (with Ollama)',
      'ZIP export locked',
      'No cloud credits',
    ],
    buttonText: 'Start Free',
    highlighted: false,
    tier: null,
  },
  {
    name: 'Pro',
    price: '$69',
    period: '/month',
    description: 'Freelancers',
    features: ['5 projects', '2 sessions', '600 cloud credits', 'Clean ZIP export', 'No BYOC'],
    buttonText: 'Upgrade to Pro',
    highlighted: false,
    tier: 'pro',
  },
  {
    name: 'Agency',
    price: '$199',
    period: '/month',
    description: 'Studios — your profit centre',
    features: ['15 projects', '3 sessions', '2,500 credits', 'BYOC included', 'Deploy + preview links'],
    buttonText: 'Upgrade to Agency',
    highlighted: true,
    tier: 'agency',
  },
  {
    name: 'Scale',
    price: '$549',
    period: '/month',
    description: 'Teams',
    features: ['Unlimited projects', '10 sessions', '10,000 credits', 'BYOC', 'Priority AI queue'],
    buttonText: 'Upgrade to Scale',
    highlighted: false,
    tier: 'scale',
  },
  {
    name: 'White-Label',
    price: '$999',
    period: '/month',
    description: 'Resellers',
    features: ['Unlimited projects', 'Unlimited sessions', '15,000 credits', 'Full rebrand', 'BYOC'],
    buttonText: 'Upgrade to White-Label',
    highlighted: false,
    tier: 'white_label',
  },
  {
    name: 'Team Enterprise',
    price: '$1,799',
    period: '/month',
    description: 'Mid companies',
    features: ['Unlimited projects', 'Unlimited sessions', '25,000 credits', 'Team seats', 'BYOC + SLA'],
    buttonText: 'Contact Sales',
    highlighted: false,
    tier: 'team_enterprise',
    contactSales: true,
    contactEmail: ENTERPRISE_SALES_EMAIL,
  },
  {
    name: 'Sovereign',
    price: '$3,499',
    period: '/month',
    description: 'Enterprise',
    features: ['Unlimited everything', '50,000 credits', 'Custom SLA', 'Dedicated support', 'BYOC'],
    buttonText: 'Contact Sales',
    highlighted: false,
    tier: 'sovereign',
    contactSales: true,
    contactEmail: ENTERPRISE_SALES_EMAIL,
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
