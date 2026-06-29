import type { ProjectPageContext } from '@/lib/project-pages';
import { pageDisplayLabel } from '@/lib/project-pages';
import { PROMPT_SUGGESTIONS } from '@/lib/prompt-suggestions';

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length > 0 && out.length < n) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

const KIND_SUGGESTIONS: Record<string, string[]> = {
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

export function buildContextualSuggestions(
  ctx: ProjectPageContext,
  max = 4
): string[] {
  const suggestions: string[] = [];
  const label = pageDisplayLabel(ctx.activePage);
  const key = pageKey(ctx.activePage);

  if (ctx.isExistingProject) {
    suggestions.push(
      `Improve the ${label} page — keep the same design system and navigation`
    );

    if (ctx.allPages.length === 1) {
      suggestions.push('Add an About page matching this site’s style and nav');
      suggestions.push('Add a Contact page with form and map');
      suggestions.push('Add a Services or Pricing page linked from the header');
    } else {
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

    if (ctx.siteKind && KIND_SUGGESTIONS[ctx.siteKind]) {
      suggestions.push(...KIND_SUGGESTIONS[ctx.siteKind].slice(0, 2));
    }

    if (ctx.businessName) {
      suggestions.push(
        `Tailor the ${label} page copy for ${ctx.businessName} — local, trustworthy tone`
      );
    }
  }

  if (suggestions.length < max) {
    suggestions.push(...pick(PROMPT_SUGGESTIONS, max - suggestions.length));
  }

  const unique = [...new Set(suggestions)];
  return unique.slice(0, max);
}
