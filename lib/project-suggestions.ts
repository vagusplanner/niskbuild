import type { ProjectPageContext } from '@/lib/project-pages';
import { pageDisplayLabel } from '@/lib/project-pages';
import { PROMPT_SUGGESTIONS } from '@/lib/prompt-suggestions';

export type SuggestionContext = ProjectPageContext & {
  /** Text currently in the prompt bar */
  currentPrompt?: string;
  /** Saved project title from dashboard */
  savedProjectTitle?: string;
  /** Google Places or other import business type */
  businessType?: string;
  /** Recent user prompts (newest last) */
  promptHistory?: string[];
};

const KIND_SUGGESTIONS: Record<string, string[]> = {
  medical: [
    'Add an online appointment booking form with date and time slots',
    'Add a services section for treatments with descriptions and pricing',
    'Add patient testimonials and insurance information',
    'Add a team section with doctor photos and credentials',
  ],
  restaurant: [
    'Add an online menu section with categories and prices',
    'Add a reservation form with date, time, and party size',
    'Add a gallery of food photos and chef specials',
    'Add location map, hours, and contact details',
  ],
  ecommerce: [
    'Add a product grid with filters and quick-view cards',
    'Add a shopping cart drawer and checkout summary',
    'Add customer reviews and trust badges',
    'Add a featured deals banner above the fold',
  ],
  saas: [
    'Add a pricing table with three tiers and feature comparison',
    'Add a product demo video section and CTA',
    'Add customer logos and testimonial carousel',
    'Add FAQ accordion for common objections',
  ],
  portfolio: [
    'Add a masonry image gallery with lightbox',
    'Add case study cards with tags and hover details',
    'Add an about section with skills and timeline',
    'Add a contact form with social links',
  ],
  booking: [
    'Add a calendar with available time slots',
    'Add service selection and staff picker',
    'Add booking confirmation and email summary UI',
    'Add cancellation policy and reminders section',
  ],
  fitness: [
    'Add workout plan cards with progress bars',
    'Add BMI and goal tracker widgets',
    'Add class schedule with book-now buttons',
    'Add before/after transformation gallery',
  ],
  blog: [
    'Add featured posts grid with categories',
    'Add newsletter signup in the sidebar',
    'Add author bio and related articles',
    'Add reading time and share buttons on posts',
  ],
  legal: [
    'Add practice area cards with consultation CTA',
    'Add attorney profiles with credentials and case results',
    'Add a FAQ section for common legal questions',
    'Add a secure contact form for case inquiries',
  ],
  real_estate: [
    'Add property listing cards with beds, baths, and price',
    'Add map search and neighborhood highlights',
    'Add agent profile with contact and showing scheduler',
    'Add mortgage calculator or open-house banner',
  ],
  local_business: [
    'Add Google Maps embed with directions and parking info',
    'Add customer reviews carousel from Google ratings',
    'Add services list with call-to-action buttons',
    'Add hours, phone, and click-to-call on mobile',
  ],
};

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  home: [
    'Improve the hero headline and primary call-to-action',
    'Add social proof logos below the hero',
    'Make the layout more mobile-friendly',
  ],
  about: [
    'Add team member cards with photos and roles',
    'Add company story timeline and mission statement',
    'Add values section with icons',
  ],
  contact: [
    'Add contact form with validation and map embed',
    'Add office hours and support channels',
    'Add live chat prompt and FAQ links',
  ],
  pricing: [
    'Add monthly vs annual toggle on pricing cards',
    'Highlight the recommended plan',
    'Add money-back guarantee and FAQ below pricing',
  ],
  services: [
    'Add service cards with icons and short descriptions',
    'Add process steps from inquiry to delivery',
    'Add testimonials specific to each service',
  ],
};

function pageKey(path: string): string {
  const base = path.replace(/^pages\//, '').replace(/\.html?$/i, '').toLowerCase();
  if (base === 'index') return 'home';
  return base;
}

function mapBusinessTypeToKind(businessType?: string): string | undefined {
  if (!businessType) return undefined;
  const t = businessType.toLowerCase();
  if (/doctor|dental|clinic|hospital|medical|health/.test(t)) return 'medical';
  if (/restaurant|food|cafe|meal|bakery|bar/.test(t)) return 'restaurant';
  if (/store|shop|retail|grocery/.test(t)) return 'ecommerce';
  if (/lawyer|attorney|legal/.test(t)) return 'legal';
  if (/gym|fitness|yoga/.test(t)) return 'fitness';
  if (/real estate|realtor|property/.test(t)) return 'real_estate';
  if (/beauty|salon|spa|hair/.test(t)) return 'booking';
  return 'local_business';
}

function detectSiteKind(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/medical|clinic|doctor|dental|patient|healthcare|hospital|physician/.test(t)) return 'medical';
  if (/restaurant|menu|cafe|food|dining|bakery/.test(t)) return 'restaurant';
  if (/shop|store|cart|ecommerce|product|checkout|retail/.test(t)) return 'ecommerce';
  if (/saas|pricing|subscription|dashboard|startup|software/.test(t)) return 'saas';
  if (/portfolio|photographer|gallery|creative|designer/.test(t)) return 'portfolio';
  if (/booking|appointment|calendar|schedule|salon|spa/.test(t)) return 'booking';
  if (/fitness|gym|workout|health club|yoga/.test(t)) return 'fitness';
  if (/blog|article|newsletter|magazine/.test(t)) return 'blog';
  if (/law|legal|attorney|lawyer|firm/.test(t)) return 'legal';
  if (/real estate|property|realtor|listing|rental/.test(t)) return 'real_estate';
  return undefined;
}

function collectSubjectText(ctx: SuggestionContext): string {
  return [
    ctx.savedProjectTitle,
    ctx.projectTitle,
    ctx.primaryHeading,
    ctx.businessName,
    ctx.businessType,
    ctx.currentPrompt,
    ...(ctx.promptHistory ?? []).slice(-4),
  ]
    .filter(Boolean)
    .join('\n');
}

function resolveSiteKind(ctx: SuggestionContext): string | undefined {
  return (
    ctx.siteKind ||
    mapBusinessTypeToKind(ctx.businessType) ||
    detectSiteKind(collectSubjectText(ctx))
  );
}

function hasEstablishedSubject(ctx: SuggestionContext): boolean {
  if (ctx.isExistingProject) return true;
  if (ctx.businessName || ctx.savedProjectTitle) return true;
  const text = collectSubjectText(ctx);
  return text.trim().length > 24 && detectSiteKind(text) !== undefined;
}

function rankByRelevance(suggestions: string[], ctx: SuggestionContext): string[] {
  const needle = [
    ctx.currentPrompt,
    ctx.savedProjectTitle,
    ctx.businessName,
    ctx.primaryHeading,
    resolveSiteKind(ctx),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!needle.trim()) return suggestions;

  const tokens = needle.split(/[^a-z0-9]+/i).filter((w) => w.length > 3);
  const score = (s: string) => {
    const lower = s.toLowerCase();
    return tokens.reduce((n, w) => n + (lower.includes(w) ? 2 : 0), 0);
  };

  return [...suggestions].sort((a, b) => score(b) - score(a));
}

export function buildContextualSuggestions(ctx: SuggestionContext, max = 4): string[] {
  if (!hasEstablishedSubject(ctx)) {
    return PROMPT_SUGGESTIONS.slice(0, max);
  }

  const suggestions: string[] = [];
  const label = pageDisplayLabel(ctx.activePage);
  const key = pageKey(ctx.activePage);
  const siteKind = resolveSiteKind(ctx);
  const subjectName =
    ctx.businessName || ctx.savedProjectTitle || ctx.primaryHeading || ctx.projectTitle;

  suggestions.push(
    `Improve the ${label} page — keep the same design system and navigation`
  );

  if (subjectName && siteKind) {
    suggestions.push(
      `Refine ${label} copy and layout for this ${siteKind.replace(/_/g, ' ')} site (“${subjectName}”)`
    );
  } else if (subjectName) {
    suggestions.push(`Tailor the ${label} page for “${subjectName}” with on-brand copy`);
  }

  if (ctx.isExistingProject && ctx.allPages.length === 1) {
    suggestions.push('Add an About page matching this site’s style and nav');
    suggestions.push('Add a Contact page with form and map');
  } else if (ctx.isExistingProject) {
    const missing = ['about', 'contact', 'pricing', 'services'].filter(
      (name) => !ctx.allPages.some((p) => pageKey(p) === name)
    );
    if (missing[0]) {
      suggestions.push(
        `Create a new ${missing[0].charAt(0).toUpperCase() + missing[0].slice(1)} page consistent with this site`
      );
    }
  }

  if (PAGE_SUGGESTIONS[key]) {
    suggestions.push(...PAGE_SUGGESTIONS[key].slice(0, 2));
  }

  if (siteKind && KIND_SUGGESTIONS[siteKind]) {
    suggestions.push(...KIND_SUGGESTIONS[siteKind].slice(0, 3));
  }

  if (ctx.businessName) {
    suggestions.push(
      `Highlight ${ctx.businessName} reviews, hours, and location on the ${label} page`
    );
  }

  const unique = [...new Set(suggestions)];
  return rankByRelevance(unique, ctx).slice(0, max);
}
