export type TemplateComplexity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  price: number;
  complexity: TemplateComplexity;
  downloads: number;
  author: string;
  category: string;
  featured: boolean;
  createdAt: string;
}

/** Price scales with complexity: 2 free starters → $49 enterprise suite */
function priceForComplexity(complexity: TemplateComplexity): number {
  const ladder: Record<TemplateComplexity, number> = {
    1: 0,
    2: 0,
    3: 9,
    4: 12,
    5: 19,
    6: 25,
    7: 29,
    8: 35,
    9: 42,
    10: 49,
  };
  return ladder[complexity];
}

export function complexityLabel(complexity: TemplateComplexity): string {
  if (complexity <= 2) return 'Starter';
  if (complexity <= 4) return 'Essential';
  if (complexity <= 6) return 'Professional';
  if (complexity <= 8) return 'Advanced';
  return 'Enterprise';
}

export function formatTemplatePrice(price: number): string {
  return price === 0 ? 'Free' : `$${price}`;
}

type TemplateDraft = Omit<MarketplaceTemplate, 'price'>;

const MARKETPLACE_DRAFTS: TemplateDraft[] = [
  {
    id: '1',
    name: 'Portfolio Builder',
    description: 'Single-page creative portfolio with project gallery and contact form — perfect first project.',
    prompt:
      'Create a minimalist portfolio for a creative professional with a hero section, filterable project gallery (6 projects), about section with skills bars, and a contact form. Use dark theme with cyan accents and Tailwind CSS.',
    complexity: 1,
    downloads: 2840,
    author: 'NiskBuild',
    category: 'portfolio',
    featured: true,
    createdAt: '2026-01-10',
  },
  {
    id: '2',
    name: 'Waitlist Landing Page',
    description: 'Simple conversion-focused landing page with email capture and feature highlights.',
    prompt:
      'Create a SaaS waitlist landing page with hero headline, 3 feature cards, email signup form, social proof counter, and footer. Clean dark UI with gradient CTA button.',
    complexity: 2,
    downloads: 1920,
    author: 'NiskBuild',
    category: 'marketing',
    featured: true,
    createdAt: '2026-01-15',
  },
  {
    id: '3',
    name: 'News Aggregator',
    description: 'RSS-style feed reader with categories, saved articles, and dark mode toggle.',
    prompt:
      'Create a news aggregator with mock article cards, category filter tabs, save-for-later bookmarks, search bar, and dark/light mode toggle. Responsive grid layout.',
    complexity: 3,
    downloads: 890,
    author: 'NewsHub',
    category: 'news',
    featured: false,
    createdAt: '2026-02-01',
  },
  {
    id: '4',
    name: 'Invoice Generator',
    description: 'Professional invoicing with line items, tax calculation, and PDF-ready layout.',
    prompt:
      'Create an invoice generator with client selector, line items table, tax and discount fields, live total calculation, and a print-ready invoice preview. Professional styling.',
    complexity: 3,
    downloads: 756,
    author: 'Finance Pro',
    category: 'finance',
    featured: false,
    createdAt: '2026-02-05',
  },
  {
    id: '5',
    name: 'Fitness Tracker',
    description: 'Workout logging, progress charts, and achievement badges for health apps.',
    prompt:
      'Create a fitness tracker with workout log form (cardio/strength), weekly progress chart, BMI calculator, meal log sidebar, and achievement badges. Modern green accent UI.',
    complexity: 4,
    downloads: 612,
    author: 'FitTech',
    category: 'health',
    featured: true,
    createdAt: '2026-02-10',
  },
  {
    id: '6',
    name: 'Task Manager',
    description: 'Kanban board with drag-and-drop columns, priorities, and due dates.',
    prompt:
      'Create a task management app with drag-and-drop kanban board (To Do, In Progress, Done), priority tags, due date picker, and task detail modal. Use Tailwind CSS.',
    complexity: 5,
    downloads: 1340,
    author: 'NiskBuild',
    category: 'productivity',
    featured: true,
    createdAt: '2026-02-15',
  },
];

// Remaining templates with explicit complexity — prices auto-applied
const MORE_TEMPLATES: TemplateDraft[] = [
  {
    id: '7',
    name: 'CRM System',
    description: 'Contact management, deal pipeline, and activity timeline for small teams.',
    prompt:
      'Create a CRM system with contact list, deal pipeline kanban, activity timeline, notes panel, and search/filter. Modern UI with purple accents.',
    complexity: 5,
    downloads: 980,
    author: 'NiskBuild',
    category: 'crm',
    featured: true,
    createdAt: '2026-02-20',
  },
  {
    id: '8',
    name: 'Ecommerce Dashboard',
    description: 'Product catalog, orders table, revenue charts, and inventory overview.',
    prompt:
      'Create an ecommerce admin dashboard with product listing, order management table, revenue line chart, low-stock alerts, and customer list. Blue professional theme.',
    complexity: 6,
    downloads: 1120,
    author: 'NiskBuild',
    category: 'ecommerce',
    featured: true,
    createdAt: '2026-03-01',
  },
  {
    id: '9',
    name: 'Food Delivery App',
    description: 'Restaurant listings, menu cart, order tracking, and customer reviews.',
    prompt:
      'Create a food delivery app with restaurant cards, menu with add-to-cart, checkout summary, order status tracker, and star reviews. Mobile-first design.',
    complexity: 6,
    downloads: 445,
    author: 'FoodTech',
    category: 'ecommerce',
    featured: false,
    createdAt: '2026-03-05',
  },
  {
    id: '10',
    name: 'Social Media Dashboard',
    description: 'Post scheduling, engagement analytics, and multi-platform metrics.',
    prompt:
      'Create a social media dashboard with post scheduling calendar, engagement charts, platform tabs (Twitter, LinkedIn, Instagram mock), and content performance table.',
    complexity: 7,
    downloads: 334,
    author: 'Social Pro',
    category: 'analytics',
    featured: false,
    createdAt: '2026-03-10',
  },
  {
    id: '11',
    name: 'Real Estate Platform',
    description: 'Property search, agent profiles, mortgage calculator, and lead forms.',
    prompt:
      'Create a real estate platform with property cards, advanced filters, agent profiles, mortgage calculator, map placeholder, and contact inquiry forms.',
    complexity: 7,
    downloads: 278,
    author: 'Realty Hub',
    category: 'realestate',
    featured: false,
    createdAt: '2026-03-15',
  },
  {
    id: '12',
    name: 'Event Management System',
    description: 'Event creation, ticket tiers, attendee list, and QR check-in simulation.',
    prompt:
      'Create an event management system with event creation wizard, ticket tier pricing, attendee dashboard, QR check-in mock scanner, and email notification settings.',
    complexity: 8,
    downloads: 198,
    author: 'EventPro',
    category: 'events',
    featured: false,
    createdAt: '2026-03-20',
  },
  {
    id: '13',
    name: 'Recruitment Platform',
    description: 'Job board, applicant pipeline, resume preview, and interview scheduling.',
    prompt:
      'Create a recruitment platform with job posting board, candidate pipeline stages, resume preview panel, skill scoring, and interview scheduling calendar.',
    complexity: 8,
    downloads: 167,
    author: 'HireFlow',
    category: 'hr',
    featured: false,
    createdAt: '2026-03-25',
  },
  {
    id: '14',
    name: 'Healthcare Portal',
    description: 'Appointment booking, patient records, prescriptions, and secure messaging.',
    prompt:
      'Create a healthcare portal with appointment booking calendar, patient dashboard, doctor profiles, prescription refill form, and secure messaging inbox.',
    complexity: 9,
    downloads: 89,
    author: 'HealthSoft',
    category: 'healthcare',
    featured: false,
    createdAt: '2026-04-01',
  },
  {
    id: '15',
    name: 'Online Learning Platform',
    description: 'Full LMS: course catalog, video lessons, quizzes, certificates, and instructor dashboard.',
    prompt:
      'Create an online learning platform with course catalog, video lesson player, quiz system with grading, certificate generator, student progress dashboard, and instructor analytics. Most comprehensive multi-module app.',
    complexity: 10,
    downloads: 156,
    author: 'EduTech',
    category: 'education',
    featured: true,
    createdAt: '2026-04-05',
  },
];

export const ALL_MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  ...MARKETPLACE_DRAFTS,
  ...MORE_TEMPLATES,
]
  .map((t) => ({
    ...t,
    price: priceForComplexity(t.complexity),
  }))
  .sort((a, b) => a.complexity - b.complexity);

export function getTemplateById(id: string): MarketplaceTemplate | undefined {
  return ALL_MARKETPLACE_TEMPLATES.find((t) => t.id === id);
}

/** Agency+ subscribers unlock the full marketplace */
export const MARKETPLACE_UNLOCK_TIERS = ['agency', 'scale', 'white_label', 'sovereign'] as const;

export function canAccessTemplate(
  template: MarketplaceTemplate,
  tier: string,
  purchasedIds: string[]
): boolean {
  if (template.price === 0) return true;
  if (MARKETPLACE_UNLOCK_TIERS.includes(tier as (typeof MARKETPLACE_UNLOCK_TIERS)[number])) {
    return true;
  }
  return purchasedIds.includes(template.id);
}
