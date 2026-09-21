/**
 * NiskBuild Tips — short Apple Tips–style cards.
 * Deep-links into real product pages /docs articles. Not a second CMS.
 */

export type TipSection =
  | 'first-15'
  | 'plans'
  | 'builder'
  | 'publish'
  | 'import'
  | 'ai-helpers';

export type TipCard = {
  id: string;
  section: TipSection;
  title: string;
  /** One-line when to use this */
  when: string;
  /** Why it matters */
  why: string;
  /** How to do it (1–3 short steps) */
  how: string;
  href: string;
  hrefLabel: string;
  /** Include in featured rotation */
  featured?: boolean;
};

export const TIP_SECTIONS: { id: TipSection; label: string; blurb: string }[] = [
  {
    id: 'first-15',
    label: 'First 15 minutes',
    blurb: 'Get from sign-in to a working preview quickly.',
  },
  {
    id: 'plans',
    label: 'Plans',
    blurb: 'What each tier unlocks — without the sales deck.',
  },
  {
    id: 'builder',
    label: 'Builder',
    blurb: 'Prompt, generate, refine, and save your project.',
  },
  {
    id: 'publish',
    label: 'Publish & PWA',
    blurb: 'Ship a web app, installable PWA, or App Store package.',
  },
  {
    id: 'import',
    label: 'Import',
    blurb: 'Bring existing apps and local business data in.',
  },
  {
    id: 'ai-helpers',
    label: 'AI helpers',
    blurb: 'Help chat vs code-generation — two different tools.',
  },
];

export const TIPS: TipCard[] = [
  {
    id: 'open-builder',
    section: 'first-15',
    title: 'Start in the Builder, not the blank page',
    when: 'You just signed in and want something on screen fast.',
    why: 'The Builder is where prompts become a previewable app — Dashboard is for overview, not creation.',
    how: 'Open Builder from the top nav → describe who the app is for and what it should do in 1–2 sentences → Generate.',
    href: '/builder',
    hrefLabel: 'Open Builder',
    featured: true,
  },
  {
    id: 'first-prompt',
    section: 'first-15',
    title: 'Write prompts like a brief, not a wish list',
    when: 'Your first generate looks generic or incomplete.',
    why: 'Clear audience + primary action beats a long feature laundry list.',
    how: 'Include: who uses it, the main job (e.g. “book appointments”), and any must-have pages. Generate, then refine.',
    href: '/docs/welcome-to-niskbuild',
    hrefLabel: 'Welcome guide',
    featured: true,
  },
  {
    id: 'use-docs-panel',
    section: 'first-15',
    title: 'Help without leaving your work',
    when: 'You’re mid-build and don’t want to lose context.',
    why: 'The ? button opens searchable docs in a side panel — same corpus as /docs, faster for quick lookups.',
    how: 'Click ? in the header (or open Tips for bite-sized cards). Search for PWA, pricing, or Builder.',
    href: '/docs',
    hrefLabel: 'Browse docs',
  },
  {
    id: 'plan-sandbox',
    section: 'plans',
    title: 'Sandbox is for learning the loop',
    when: 'You’re on Free / Sandbox and wondering what’s limited.',
    why: 'You can still generate and preview — exports and higher quotas unlock on paid plans.',
    how: 'Follow the Sandbox getting-started doc for your first project, then compare plans when you’re ready to ship.',
    href: '/docs/getting-started-free',
    hrefLabel: 'Sandbox guide',
  },
  {
    id: 'plan-agency-export',
    section: 'plans',
    title: 'App Store export needs Agency+',
    when: 'You see Export / Xcode options greyed out or unavailable.',
    why: 'iOS packaging (Capacitor → Xcode) is gated to Agency Studio and above — not a broken button.',
    how: 'Check Pricing for Agency Studio+, then use Builder → Export on a Mac with Xcode for the real archive.',
    href: '/pricing',
    hrefLabel: 'Compare plans',
    featured: true,
  },
  {
    id: 'plan-white-label-domain',
    section: 'plans',
    title: 'Custom domains live on White-Label+',
    when: 'You want customers on yourbrand.com instead of a NiskBuild URL.',
    why: 'Custom hostname setup is a White-Label (and higher) capability — configure it under Settings once eligible.',
    how: 'Upgrade if needed → Dashboard Settings → custom domain → follow verification steps.',
    href: '/docs/getting-started-white-label',
    hrefLabel: 'White-Label guide',
  },
  {
    id: 'builder-generate-again',
    section: 'builder',
    title: 'Iterate with a tighter prompt',
    when: 'The preview is close but not right.',
    why: 'Second generates that name what to keep and what to change beat starting from scratch.',
    how: 'Say what’s correct (“keep the dashboard”) and what’s wrong (“replace the nav with…”) → Generate again.',
    href: '/builder',
    hrefLabel: 'Open Builder',
    featured: true,
  },
  {
    id: 'builder-shortcuts',
    section: 'builder',
    title: 'Builder keyboard shortcuts',
    when: 'You’re editing often and want less mouse travel.',
    why: 'Save, the Code/Styles inspector, and fullscreen stay under your fingers while you iterate.',
    how: '⌘/Ctrl+S save · ⌘/Ctrl+B show/hide Code inspector · F fullscreen. Header also has Save and Deploy buttons; Menu ▾ groups View / Edit / Project & share.',
    href: '/builder',
    hrefLabel: 'Open Builder',
  },
  {
    id: 'builder-project-settings',
    section: 'builder',
    title: 'Where did SEO / Integrations go?',
    when: 'You used to find SEO, Integrations, Blueprint, Ollama, or Credits in the side inspector.',
    why: 'Those tools moved into Project Settings so the inspector stays focused on Code and Styles while you build.',
    how: 'In the Builder canvas header, click Project (gear). Open tabs for SEO, Integrations, Blueprint, AI/Ollama, and Credits/ROI — same capabilities, cleaner coding surface.',
    href: '/builder',
    hrefLabel: 'Open Builder',
    featured: true,
  },
  {
    id: 'builder-code-styles',
    section: 'builder',
    title: 'Inspector is Code + Styles only',
    when: 'You need to edit files or tweak a selected element’s look.',
    why: 'The side panel is now a coding surface: file tree + editor, plus Styles when Visual edit has a target selected.',
    how: 'Open the inspector (Code toggle, Menu → Show inspector, or ⌘/Ctrl+B). For Styles: Menu → Visual edit → click an element. Everything else lives under Project.',
    href: '/builder',
    hrefLabel: 'Open Builder',
  },
  {
    id: 'builder-save-projects',
    section: 'builder',
    title: 'Saved work lives under Projects',
    when: 'You generated something useful and need it tomorrow.',
    why: 'Projects is your library of builds — don’t rely on a single browser tab.',
    how: 'Click Save in the Builder header (or Menu → Save project), then reopen anytime from My Projects in the logo menu.',
    href: '/projects',
    hrefLabel: 'My Projects',
  },
  {
    id: 'builder-deploy-preview',
    section: 'builder',
    title: 'Deployments are live previews',
    when: 'You want a shareable URL before a full export.',
    why: 'Deployments let teammates click a link without installing anything.',
    how: 'Click Deploy in the Builder header (or Menu → Deploy live preview), then open Deployments to copy the preview link.',
    href: '/deployments',
    hrefLabel: 'Deployments',
  },
  {
    id: 'pwa-install',
    section: 'publish',
    title: 'Ship an installable PWA first',
    when: 'You want mobile presence without waiting on App Store review.',
    why: 'A Progressive Web App installs from the browser (Add to Home Screen) and is available on more plans than Xcode export.',
    how: 'Export / publish as PWA, open on phone, use the browser’s Install / Add to Home Screen action.',
    href: '/docs/progressive-web-apps-pwa',
    hrefLabel: 'PWA guide',
    featured: true,
  },
  {
    id: 'app-store-mac',
    section: 'publish',
    title: 'App Store builds need a Mac + Xcode',
    when: 'Cloud export fails or you’re ready for TestFlight.',
    why: 'Apple’s toolchain only runs on macOS — NiskBuild prepares the project; you archive locally.',
    how: 'Agency+ → Builder Export → download Xcode zip → open .xcworkspace → Archive → upload to App Store Connect.',
    href: '/docs/submitting-to-app-store',
    hrefLabel: 'App Store walkthrough',
  },
  {
    id: 'marketplace-clone',
    section: 'publish',
    title: 'Clone a Marketplace starter',
    when: 'You’d rather start from a template than a blank prompt.',
    why: 'Templates give structure (CRM, booking, etc.) so your first prompt can focus on branding and specifics.',
    how: 'Open Marketplace → pick a listing → clone into your workspace → refine in Builder.',
    href: '/marketplace',
    hrefLabel: 'Marketplace',
  },
  {
    id: 'import-base44',
    section: 'import',
    title: 'Importing from Base44 is a migration',
    when: 'You already built on Base44 and want NiskBuild hosting.',
    why: 'It’s source + Supabase + migrations — not a one-click upload. Plan a verification pass after import.',
    how: 'Read the import guide, map entities via the compat layer, run migrations, then smoke-test auth and data.',
    href: '/docs/importing-from-base44',
    hrefLabel: 'Base44 import guide',
    featured: true,
  },
  {
    id: 'import-google-places',
    section: 'import',
    title: 'Seed local business pages from Google Places',
    when: 'You’re building a directory or local-service site.',
    why: 'Places import can pull real business details so you’re not typing listings by hand.',
    how: 'In Builder (Pro+), open the prompt attach / + menu → Google Places, search a business, review enrichment, then generate around that data. Plan walkthrough: Getting Started on Pro Worker.',
    href: '/builder',
    hrefLabel: 'Open Builder',
  },
  {
    id: 'ai-help-vs-codegen',
    section: 'ai-helpers',
    title: 'Help chat ≠ code generation',
    when: 'You’re unsure which “AI” button to use.',
    why: 'Nisk (the in-app guide) answers product questions. Builder Generate writes and updates your app. Mixing them up wastes credits and time.',
    how: 'Stuck on “how do I export?” → Nisk / Tips / Support. Want a new screen or feature → Builder prompt → Generate.',
    href: '/docs',
    hrefLabel: 'Docs home',
    featured: true,
  },
  {
    id: 'ai-help-assistant',
    section: 'ai-helpers',
    title: 'Ask Nisk for product how-tos',
    when: 'You need an answer about NiskBuild itself (plans, export, settings).',
    why: 'Nisk is trained on platform guidance — not for inventing your app’s UI.',
    how: 'Open the N floating chat (or Support), ask a concrete question, then follow any linked docs or tips it cites.',
    href: '/dashboard/support',
    hrefLabel: 'Support',
  },
  {
    id: 'ai-builder-codegen',
    section: 'ai-helpers',
    title: 'Codegen belongs in the Builder prompt',
    when: 'You want pages, flows, or logic created or changed.',
    why: 'Only Builder Generate mutates your project files and preview.',
    how: 'Describe the change in the Builder → Generate → review preview → click Save in the header. Use Plan mode on eligible plans for multi-step roadmaps. Project Settings (gear) holds SEO and integrations — not the Code inspector.',
    href: '/builder',
    hrefLabel: 'Open Builder',
  },
  {
    id: 'settings-security',
    section: 'first-15',
    title: 'Lock down Settings early',
    when: 'You’ve created anything you care about keeping.',
    why: 'Billing, API keys, and security live under Settings — worth a once-over before sharing deploy links.',
    how: 'Open Dashboard → Settings. Confirm profile, billing tab, and any API keys you’re using.',
    href: '/dashboard/settings',
    hrefLabel: 'Settings',
  },
];

export function getFeaturedTips(): TipCard[] {
  return TIPS.filter((t) => t.featured);
}

/** Stable tip-of-day from curated featured set (rotates by UTC day). */
export function getTipOfDay(date = new Date()): TipCard {
  const featured = getFeaturedTips();
  const pool = featured.length > 0 ? featured : TIPS;
  const day = Math.floor(date.getTime() / 86_400_000);
  return pool[Math.abs(day) % pool.length]!;
}

export function tipsBySection(section: TipSection): TipCard[] {
  return TIPS.filter((t) => t.section === section);
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

/** Keyword search over curated tips (title / when / why / how). */
export function searchTips(query: string, limit = 4): TipCard[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9+/]+/)
    .filter((t) => t.length > 1 && !TIP_STOP.has(t));
  if (tokens.length === 0) return [];

  const scored = TIPS.map((tip) => {
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
