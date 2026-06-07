export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted: boolean;
  tier: string | null;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: ['1 project', 'Local AI', 'Live preview', 'Watermarked export'],
    buttonText: 'Get Started Free',
    highlighted: false,
    tier: null,
  },
  {
    name: 'Builder Pro',
    price: '$69',
    period: '/month',
    description: 'For professional freelancers',
    features: ['3 projects', 'Cloud AI (600 credits)', 'Clean ZIP export', 'Priority support'],
    buttonText: 'Upgrade to Pro',
    highlighted: false,
    tier: 'pro',
  },
  {
    name: 'Agency Studio',
    price: '$199',
    period: '/month',
    description: 'For growing agencies',
    features: ['15 projects', '2,500 cloud credits', '1-click deploy', 'Client preview links'],
    buttonText: 'Upgrade to Agency',
    highlighted: true,
    tier: 'agency',
  },
  {
    name: 'Agency Scale',
    price: '$549',
    period: '/month',
    description: 'For high-volume teams',
    features: ['Unlimited projects', '10,000 cloud credits', '10 team seats', 'Priority AI'],
    buttonText: 'Upgrade to Scale',
    highlighted: false,
    tier: 'scale',
  },
  {
    name: 'White-Label',
    price: '$1,199',
    period: '/month',
    description: 'For resellers',
    features: ['Complete rebranding', 'Custom domain', '15,000 pooled credits', 'Unlimited child users'],
    buttonText: 'Contact Sales',
    highlighted: false,
    tier: 'white_label',
  },
];

export const PRICING_FAQ = [
  {
    q: 'Do I own my code?',
    a: 'Yes, completely. When you export your project, you get the full source code with no watermarks, no lock-in, and no hidden fees.',
  },
  {
    q: 'What AI powers NiskBuild?',
    a: 'NiskBuild uses fast cloud AI for generation, with optional local models. You choose speed vs. privacy per project.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no hidden fees. Cancel with one click from your account.',
  },
  {
    q: 'How does the Marketplace work?',
    a: 'Browse pre-built templates, click "Use Template", and the prompt loads directly into the builder so you can customize and ship faster.',
  },
  {
    q: 'Is my data private?',
    a: 'Your code stays yours. We never sell your data. Anonymous build telemetry helps us improve the platform.',
  },
];
