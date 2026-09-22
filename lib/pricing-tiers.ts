export type BillingInterval = 'month' | 'year';

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  /** Annual price shown when billing toggle is on (2 months free) */
  annualPrice?: string;
  annualPeriod?: string;
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
      '5 cloud AI credits (trial)',
      'Model picker (spend credits on any model)',
      'Builder access (after phone verification)',
      'ZIP export locked',
      'No Marketplace access',
    ],
    buttonText: 'Start Free',
    highlighted: false,
    tier: null,
  },
  {
    name: 'Basic',
    price: '$69',
    period: '/month',
    annualPrice: '$690',
    annualPeriod: '/year',
    description: 'Best for: Solo freelancers',
    features: [
      '5 projects',
      '2 sessions',
      '150 cloud credits',
      'Spend credits on any model (speed or premium)',
      'Clean ZIP export',
      'PWA mobile export',
      '❌ No BYOC',
      '❌ No Google Places',
    ],
    buttonText: 'Choose Basic',
    highlighted: false,
    tier: 'basic',
  },
  {
    name: 'Pro Worker',
    price: '$129',
    period: '/month',
    annualPrice: '$1,290',
    annualPeriod: '/year',
    description: 'Best for: Power users',
    features: [
      '15 projects',
      '5 sessions',
      '600 cloud credits',
      'Model picker — any model per generation',
      'Clean ZIP export',
      'PWA mobile export',
      '✅ BYOC included',
      '✅ Google Places AI',
      '✅ Phaser.js games',
    ],
    buttonText: 'Choose Pro',
    highlighted: true,
    tier: 'pro',
  },
  {
    name: 'Agency Studio',
    price: '$299',
    period: '/month',
    annualPrice: '$2,990',
    annualPeriod: '/year',
    description: 'Best for: Freelance studios',
    features: [
      '25 projects',
      '10 sessions',
      '2,500 credits',
      'BYOC included',
      'Deploy + preview links',
      'Client approval workflow (Coming soon)',
      'Team seats (3 included)',
    ],
    buttonText: 'Choose Agency',
    highlighted: false,
    tier: 'agency',
  },
  {
    name: 'Scale Team',
    price: '$799',
    period: '/month',
    annualPrice: '$7,990',
    annualPeriod: '/year',
    description: 'Best for: 5–15 person teams',
    features: [
      'Unlimited projects',
      '20 sessions',
      '10,000 credits',
      'BYOC + priority queue',
      'Team seats (10 included)',
      'Shared component library (Coming soon)',
      'Scheduled social posting (Coming soon)',
    ],
    buttonText: 'Choose Scale',
    highlighted: false,
    tier: 'scale',
  },
  {
    name: 'White-Label',
    price: '$1,199',
    period: '/month',
    annualPrice: '$11,990',
    annualPeriod: '/year',
    description: 'Best for: Resellers & agencies',
    features: [
      'Unlimited projects',
      'Unlimited sessions',
      '15,000 credits',
      'Team seats (15 included)',
      'Full rebranding',
      'Custom domain mapping',
      'Remove NiskBuild branding',
    ],
    buttonText: 'Choose White-Label',
    highlighted: false,
    tier: 'white_label',
  },
  {
    name: 'Team Enterprise',
    price: '$1,999',
    period: '/month',
    annualPrice: '$19,990',
    annualPeriod: '/year',
    description: 'Best for: Mid-size companies',
    features: [
      'Unlimited everything',
      '25,000 credits',
      'Team seats (25 included)',
      'SLA agreement (Coming soon)',
      'Dedicated Slack channel (Coming soon)',
      'SOC2 readiness pack (Coming soon)',
    ],
    buttonText: 'Choose Enterprise',
    highlighted: false,
    tier: 'team_enterprise',
  },
  {
    name: 'Sovereign',
    price: 'From $3,999',
    period: '/mo + $1,500 setup',
    annualPrice: 'From $39,990',
    annualPeriod: '/yr + $1,500 setup',
    description: 'Best for: Enterprise',
    features: [
      'Unlimited everything',
      '50,000 credits',
      'Team seats (50 included)',
      'Custom SLA (Coming soon)',
      'Dedicated AWS cluster (Coming soon)',
      'Zero-data tracking',
      'GDPR compliance pack',
    ],
    buttonText: 'Choose Sovereign',
    highlighted: false,
    tier: 'sovereign',
  },
];

export const PRICING_FAQ = [
  {
    q: 'Do I own my code?',
    a: 'Yes. On any paid plan, you get the full, clean source code — no watermarks, no lock-in, no hidden fees. (Sandbox lets you build and preview for free; upgrade any time to export clean code you can host anywhere.)',
  },
  {
    q: 'What is the difference between Basic and Pro Worker?',
    a: 'Basic ($69) unlocks clean exports and PWA for solo freelancers. Pro Worker ($129) adds BYOC, Google Places AI, Phaser.js games, and 4× the cloud credits.',
  },
  {
    q: 'Why is BYOC on Pro Worker and above?',
    a: 'Bring-your-own API keys let power users run unlimited local/cloud builds with their own providers. Basic stays on NiskBuild cloud credits only.',
  },
  {
    q: 'How do cloud AI credits work with the model picker?',
    a: 'Every plan includes cloud AI credits you can spend on any model — pick speed or premium quality per generation. DeepSeek V4.1 Flash costs 1 credit (default). Higher-tier models cost more credits per run. Models at 20+ credits (Opus 5, GPT-5.6 Sol, GPT-6 Astra) require Pro Worker or above.',
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
    q: 'Is annual billing available?',
    a: 'Yes. Switch to annual on the pricing page and save 2 months — billed once per year via Stripe.',
  },
  {
    q: 'Is my data private?',
    a: 'Your code stays yours. Anonymous macro telemetry is opt-out in Settings.',
  },
];
