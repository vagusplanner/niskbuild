/**
 * SuperEduc8 Tips — short curated cards with deep-links into real product pages.
 * Architectural cousin of NiskBuild Tips; content is SE8-only (not shared corpus).
 *
 * `subpath` is resolved with shiftAiAppPath() so links stay correct on
 * supereduc8.com (/billing) and NiskBuild (/builder/shift-ai/billing).
 */

export type Se8TipSection =
  | 'getting-started'
  | 'learning-tools'
  | 'billing'
  | 'account'
  | 'for-parents';

export type Se8TipCard = {
  id: string;
  section: Se8TipSection;
  title: string;
  when: string;
  why: string;
  how: string;
  /** App subpath, e.g. `/billing` — never a NiskBuild-only path */
  subpath: string;
  hrefLabel: string;
  featured?: boolean;
};

export const SE8_TIP_SECTIONS: { id: Se8TipSection; label: string; blurb: string }[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    blurb: 'Signup paths, curriculum, and first steps after you land in the app.',
  },
  {
    id: 'learning-tools',
    label: 'Learning Tools',
    blurb: 'How the study features work — tutoring is separate from product Tips.',
  },
  {
    id: 'billing',
    label: 'Billing & Plans',
    blurb: 'Trial, subscribe, Family children, discounts, and cancel via Stripe.',
  },
  {
    id: 'account',
    label: 'Account',
    blurb: 'Password, data export, and deleting your account.',
  },
  {
    id: 'for-parents',
    label: 'For Parents',
    blurb: 'Consent, invite links, and what the parent dashboard actually shows.',
  },
];

export const SE8_TIPS: Se8TipCard[] = [
  // ── Getting Started ─────────────────────────────────────────────────────
  {
    id: 'signup-paths',
    section: 'getting-started',
    title: 'Choose the right signup path',
    when: 'You are creating an account for yourself or a child.',
    why: 'SuperEduc8 uses age-appropriate signup — not NiskBuild’s phone verification.',
    how: 'Self (13+): student creates their own account. Supervised: parent email for under-13 consent. Family: household path with parent email. Open Signup and pick the matching card.',
    subpath: '/signup',
    hrefLabel: 'Open Signup',
    featured: true,
  },
  {
    id: 'curriculum-onboarding',
    section: 'getting-started',
    title: 'Set curriculum and subjects once',
    when: 'After signup, or when subjects feel wrong for your school system.',
    why: 'Tutor tone, packs, and year group options follow your curriculum and favourites.',
    how: 'Finish onboarding if prompted, then open Settings → Curriculum & year / favourite subjects. Self accounts can edit curriculum; supervised children inherit adult-managed setup.',
    subpath: '/settings',
    hrefLabel: 'Open Settings',
  },
  {
    id: 'find-tips-later',
    section: 'getting-started',
    title: 'Tips live in the sidebar',
    when: 'You need a how-to without leaving SuperEduc8.',
    why: 'These cards deep-link into real pages — they are not NiskBuild builder Tips.',
    how: 'Open Tips & Help from the Home group in the left sidebar (or the lightbulb on mobile). Use search on that page to jump to a topic.',
    subpath: '/tips',
    hrefLabel: 'Open Tips',
  },

  // ── Learning Tools ──────────────────────────────────────────────────────
  {
    id: 'ai-tutor',
    section: 'learning-tools',
    title: 'AI Tutor guides — it does not just give answers',
    when: 'You want help understanding a topic or homework question.',
    why: 'The tutor is built for learning (ages ~7–17), not for product billing questions.',
    how: 'Open AI Tutor Chat, optionally pick a subject, ask your question. Expect guiding steps — not a paste of the final answer. Premium access needs trial or a paid plan.',
    subpath: '/assistant',
    hrefLabel: 'Open AI Tutor',
    featured: true,
  },
  {
    id: 'homework-help',
    section: 'learning-tools',
    title: 'Snap Homework for photo help',
    when: 'You have a worksheet or textbook page on paper.',
    why: 'Upload or capture the problem and get structured help — gated behind trial/paid like other AI tools.',
    how: 'Open Snap Homework → upload or capture → review sections. If you see Upgrade to continue, start Subscribe from Billing.',
    subpath: '/homework',
    hrefLabel: 'Open Homework Help',
  },
  {
    id: 'flashcards',
    section: 'learning-tools',
    title: 'Build and review Smart Flashcards',
    when: 'You are revising definitions, formulas, or key facts.',
    why: 'Flashcards stay in your study toolkit alongside the tutor.',
    how: 'Open Smart Flashcards from Study. Create or generate a deck, then flip through reviews from the same screen.',
    subpath: '/flashcards',
    hrefLabel: 'Open Flashcards',
  },
  {
    id: 'quiz-arcade',
    section: 'learning-tools',
    title: 'Practise in Quiz Arcade',
    when: 'You want quick scored practice, not a long chat.',
    why: 'Arcade quizzes feed study activity used elsewhere in the app.',
    how: 'Open Quiz Arcade under Practise, pick a quiz, play through. Scores show up in your study activity over time.',
    subpath: '/arcade',
    hrefLabel: 'Open Quiz Arcade',
  },
  {
    id: 'essay-marker',
    section: 'learning-tools',
    title: 'Get essay feedback in Essay Marker',
    when: 'You have a draft and want structured marking-style feedback.',
    why: 'Separate from the tutor chat — built for longer writing review.',
    how: 'Open Essay Marker under Writing Tools, paste or upload your draft, and follow the feedback sections.',
    subpath: '/essay-marker',
    hrefLabel: 'Open Essay Marker',
  },
  {
    id: 'voice-tutor',
    section: 'learning-tools',
    title: 'Talk with Voice Tutor',
    when: 'You prefer speaking over typing.',
    why: 'Voice Tutor is a spoken study session — still a learning tool, not billing help.',
    how: 'Open Voice Tutor, allow mic access if asked, and start a spoken session. Younger learners may also use Voice Buddy.',
    subpath: '/voice-tutor',
    hrefLabel: 'Open Voice Tutor',
  },

  // ── Billing ─────────────────────────────────────────────────────────────
  {
    id: 'trial-no-card',
    section: 'billing',
    title: 'Your 14-day trial needs no card',
    when: 'You just signed up and want full features.',
    why: 'Trial is app-level: full access without entering payment details.',
    how: 'After signup/consent, use the product normally. Check Billing for “Free trial” and the end date. Subscribe anytime before it ends if you want uninterrupted premium AI.',
    subpath: '/billing',
    hrefLabel: 'Open Billing',
    featured: true,
  },
  {
    id: 'subscribe-student-family',
    section: 'billing',
    title: 'Subscribe to Student or Family',
    when: 'Trial is ending, or you are ready to pay.',
    why: 'Checkout is real Stripe Checkout from the Billing page Subscribe button.',
    how: 'Open Billing → choose Monthly/Annual and Student or Family. For Family, set additional children (0–20). Tap Subscribe and complete Stripe Checkout. Success returns to Billing.',
    subpath: '/billing',
    hrefLabel: 'Subscribe on Billing',
  },
  {
    id: 'multi-curriculum-discount',
    section: 'billing',
    title: 'Multi-curriculum discount is automatic',
    when: 'Your household studies more than one curriculum.',
    why: 'You do not enter a code — eligibility is detected and applied at Checkout when it applies.',
    how: 'Keep student curricula accurate in Settings. At Subscribe, eligible checkouts get the multi-curriculum coupon automatically. Billing shows when it is applied on an active plan.',
    subpath: '/billing',
    hrefLabel: 'View Billing',
  },
  {
    id: 'manage-cancel-portal',
    section: 'billing',
    title: 'Cancel or change payment in Stripe',
    when: 'You already have an active Student/Family subscription.',
    why: 'Cancellation and payment methods live in Stripe’s customer portal — not a fake in-app cancel switch.',
    how: 'Open Billing (or Settings → Account) → Open billing portal / Manage in Stripe. Update card, download invoices, or cancel there. You return to Billing when done.',
    subpath: '/billing',
    hrefLabel: 'Manage Billing',
  },
  {
    id: 'after-trial-ends',
    section: 'billing',
    title: 'What happens when trial ends',
    when: 'Your trial date is approaching or has passed without Subscribe.',
    why: 'Premium AI mutates (tutor, homework, etc.) require trial or paid access.',
    how: 'Without a paid plan you drop to Free and may see Upgrade to continue. Open Billing → Subscribe to restore full access. Free study chrome may still be reachable; gated AI will not.',
    subpath: '/billing',
    hrefLabel: 'Go to Billing',
  },

  // ── Account ─────────────────────────────────────────────────────────────
  {
    id: 'change-password',
    section: 'account',
    title: 'Change your password in Settings',
    when: 'You want a new password while signed in.',
    why: 'Password lives under Settings → Account — not a separate security app.',
    how: 'Open Settings, scroll to Account → Change password. Enter new password twice (show/hide eye available) → Update password.',
    subpath: '/settings',
    hrefLabel: 'Open Account settings',
  },
  {
    id: 'export-data',
    section: 'account',
    title: 'Download a JSON data export',
    when: 'You want a copy of profile/plan data.',
    why: 'Export is available now as a JSON download from Account (not a full GDPR ZIP for every table).',
    how: 'Settings → Account → Download data export (JSON). The file includes email, name, plan access, and profile payload from the live APIs.',
    subpath: '/settings',
    hrefLabel: 'Export from Settings',
  },
  {
    id: 'delete-account',
    section: 'account',
    title: 'Delete your account permanently',
    when: 'You want the account removed, including platform cleanup.',
    why: 'Deletion is real and irreversible — confirm by typing your email.',
    how: 'Settings → Account → Delete account. Type your email exactly → Delete my account. Active Stripe subs are cancelled as part of the delete flow when present.',
    subpath: '/settings',
    hrefLabel: 'Account settings',
  },

  // ── For Parents ─────────────────────────────────────────────────────────
  {
    id: 'parent-consent',
    section: 'for-parents',
    title: 'Complete parental consent for under-13s',
    when: 'You signed a child up with Supervised or Family and got an email.',
    why: 'The child stays inactive until consent completes — study features stay locked until then.',
    how: 'Use the consent link from the email. After approval, the child’s account activates and trial can start. Invalid/expired links show an error page — request a fresh signup path if needed.',
    subpath: '/signup',
    hrefLabel: 'Signup paths',
  },
  {
    id: 'parent-dashboard-scope',
    section: 'for-parents',
    title: 'Parent dashboard shows progress, not full chats',
    when: 'You open the parent invite link from Settings.',
    why: 'Privacy: full AI tutor transcripts stay on the student account; parents see summaries/progress.',
    how: 'In the student Settings, generate a Parent link and open it on a parent device. Expect progress-style visibility — not a full copy of every tutor message.',
    subpath: '/settings',
    hrefLabel: 'Generate parent link',
    featured: true,
  },
  {
    id: 'parent-billing',
    section: 'for-parents',
    title: 'Parents manage payment on Billing',
    when: 'You pay for the household Student or Family plan.',
    why: 'Subscribe, child quantity, and Stripe portal are on Billing — usually used by the adult who owns the login.',
    how: 'Sign in to the billing account → Billing → Subscribe or Open billing portal. Family additional children are chosen before Checkout on that same page.',
    subpath: '/billing',
    hrefLabel: 'Open Billing',
  },
];

export function se8TipsBySection(section: Se8TipSection): Se8TipCard[] {
  return SE8_TIPS.filter((t) => t.section === section);
}

export function getSe8FeaturedTips(): Se8TipCard[] {
  return SE8_TIPS.filter((t) => t.featured);
}

/** Stable tip-of-day from featured set (rotates by UTC day). */
export function getSe8TipOfDay(date = new Date()): Se8TipCard {
  const featured = getSe8FeaturedTips();
  const pool = featured.length > 0 ? featured : SE8_TIPS;
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  return pool[day % pool.length]!;
}

const TIP_STOP = new Set([
  'a',
  'an',
  'the',
  'to',
  'for',
  'of',
  'in',
  'on',
  'and',
  'or',
  'is',
  'are',
  'how',
  'do',
  'i',
  'my',
  'me',
  'can',
  'what',
  'where',
  'when',
  'with',
  'from',
]);

/** Keyword search over curated SE8 tips. */
export function searchSe8Tips(query: string, limit = 8): Se8TipCard[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9+/]+/)
    .filter((t) => t.length > 1 && !TIP_STOP.has(t));
  if (tokens.length === 0) return [];

  const scored = SE8_TIPS.map((tip) => {
    const hay = `${tip.title} ${tip.when} ${tip.why} ${tip.how} ${tip.section}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += tip.title.toLowerCase().includes(t) ? 3 : 1;
    }
    return { tip, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.tip);
}
