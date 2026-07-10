/**
 * Internal demand analytics categories (keyword/pattern matching only — no LLM).
 * Aligns with site-kind cues in detectSiteKind (project-pages) plus education/nonprofit.
 */

export const PROMPT_DEMAND_CATEGORIES = [
  'medical',
  'ecommerce',
  'education',
  'real_estate',
  'saas',
  'restaurant',
  'fitness',
  'nonprofit',
  'portfolio',
  'other',
] as const;

export type PromptDemandCategory = (typeof PROMPT_DEMAND_CATEGORIES)[number];

export const PROMPT_DEMAND_CATEGORY_LABELS: Record<PromptDemandCategory, string> = {
  medical: 'Medical',
  ecommerce: 'E-commerce',
  education: 'Education',
  real_estate: 'Real estate',
  saas: 'SaaS / dashboard',
  restaurant: 'Restaurant / food',
  fitness: 'Fitness',
  nonprofit: 'Nonprofit',
  portfolio: 'Portfolio / personal',
  other: 'Other',
};

/** Ordered rules — first match wins (same spirit as detectSiteKind). */
const CATEGORY_PATTERNS: { category: PromptDemandCategory; pattern: RegExp }[] = [
  {
    category: 'medical',
    pattern:
      /\b(medical|clinic|doctor|dental|dentist|patient|healthcare|health[-\s]?care|hospital|physician|telemedicine|pharmacy)\b/i,
  },
  {
    category: 'restaurant',
    pattern: /\b(restaurant|menu|cafe|café|food|dining|bakery|bistro|catering|takeaway|takeout)\b/i,
  },
  {
    category: 'ecommerce',
    pattern:
      /\b(e-?commerce|shop|store|cart|checkout|retail|product catalog|marketplace|merch)\b/i,
  },
  {
    category: 'saas',
    pattern:
      /\b(saas|pricing page|subscription|dashboard|startup|software|analytics dashboard|admin panel|b2b platform)\b/i,
  },
  {
    category: 'portfolio',
    pattern:
      /\b(portfolio|photographer|gallery|creative|designer|personal brand|resume|cv site)\b/i,
  },
  {
    category: 'fitness',
    pattern: /\b(fitness|gym|workout|yoga|crossfit|personal trainer|wellness studio)\b/i,
  },
  {
    category: 'education',
    pattern:
      /\b(education|school|university|course|learning|lms|student|classroom|tutor|quiz|curriculum)\b/i,
  },
  {
    category: 'real_estate',
    pattern: /\b(real estate|realtor|property|listing|rental|landlord|housing|apartments?)\b/i,
  },
  {
    category: 'nonprofit',
    pattern:
      /\b(nonprofit|non-profit|charity|foundation|donation|ngo|volunteer|fundraising|community org)\b/i,
  },
];

/**
 * Cheap sync classifier — keyword/pattern only (no API call).
 * Reuses the same subject cues as detectSiteKind in lib/project-pages.ts.
 */
export function classifyPromptDemandCategory(prompt: string): PromptDemandCategory {
  const text = prompt.trim();
  if (!text) return 'other';

  for (const { category, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return 'other';
}

export function isPromptDemandCategory(value: string): value is PromptDemandCategory {
  return (PROMPT_DEMAND_CATEGORIES as readonly string[]).includes(value);
}
