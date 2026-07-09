/** Detect high-confidence "add/create a [X] page" intent from builder prompts. */

const KNOWN_PAGE_NAMES: Record<string, string> = {
  contact: 'Contact',
  about: 'About',
  pricing: 'Pricing',
  services: 'Services',
  faq: 'FAQ',
  blog: 'Blog',
  team: 'Team',
  gallery: 'Gallery',
};

/** Words that indicate page-creation intent but are not page names. */
const BLOCKED_PAGE_NAMES = new Set([
  'home',
  'index',
  'landing',
  'main',
  'second',
  'another',
  'new',
  'whole',
  'full',
  'single',
  'multi',
  'extra',
]);

export type AddPageIntent = {
  pageName: string;
  confidence: 'known' | 'custom';
};

/**
 * Returns a page display name when the prompt clearly asks to add/create a new page.
 * Conservative matching — returns null when uncertain (manual "+ Page" flow unchanged).
 */
export function detectAddPageIntent(prompt: string): AddPageIntent | null {
  const trimmed = prompt.trim();
  if (!trimmed) return null;

  const knownRe =
    /\b(?:add|create|make|build)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(contact|about|pricing|services|faq|blog|team|gallery)\s+page\b/i;
  const knownMatch = trimmed.match(knownRe);
  if (knownMatch) {
    const key = knownMatch[1].toLowerCase();
    return { pageName: KNOWN_PAGE_NAMES[key] ?? knownMatch[1], confidence: 'known' };
  }

  // Custom single-word page name only (e.g. "add a careers page") — still requires "page" suffix.
  const customRe =
    /\b(?:add|create)\s+(?:a\s+|an\s+)?(?:new\s+)?([a-z][a-z0-9-]{1,18})\s+page\b/i;
  const customMatch = trimmed.match(customRe);
  if (!customMatch) return null;

  const raw = customMatch[1].toLowerCase();
  if (BLOCKED_PAGE_NAMES.has(raw)) return null;
  if (KNOWN_PAGE_NAMES[raw]) {
    return { pageName: KNOWN_PAGE_NAMES[raw], confidence: 'known' };
  }

  // Reject multi-word custom captures (too easy to misfire on "contact form landing page").
  if (/\s/.test(customMatch[1])) return null;

  const pageName = raw.charAt(0).toUpperCase() + raw.slice(1);
  return { pageName, confidence: 'custom' };
}
