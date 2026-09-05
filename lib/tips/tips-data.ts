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
    why: 'Save, inspector, and fullscreen are meant to stay under your fingers while you iterate.',
    how: '⌘/Ctrl+S save · ⌘/Ctrl+B inspector · F fullscreen. Shortcuts show in the Builder header on desktop.',
    href: '/builder',
    hrefLabel: 'Open Builder',
  },
  {
    id: 'builder-save-projects',
    section: 'builder',
    title: 'Saved work lives under Projects',
    when: 'You generated something useful and need it tomorrow.',
    why: 'Projects is your library of builds — don’t rely on a single browser tab.',
    how: 'Save from the Builder, then reopen anytime from My Projects in the logo menu.',
    href: '/projects',
    hrefLabel: 'My Projects',
  },
  {
    id: 'builder-deploy-preview',
    section: 'builder',
    title: 'Deployments are live previews',
    when: 'You want a shareable URL before a full export.',
    why: 'Deployments let teammates click a link without installing anything.',
    how: 'From your project flow, publish a deployment, then open Deployments to copy the preview link.',
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
    how: 'Use the Google Places import flow from Builder/docs, review enrichment, then generate around that data.',
    href: '/docs/importing-from-base44',
    hrefLabel: 'Import docs',
  },
  {
    id: 'ai-help-vs-codegen',
    section: 'ai-helpers',
    title: 'Help chat ≠ code generation',
    when: 'You’re unsure which “AI” button to use.',
    why: 'HelpAssistant answers product questions. Builder Generate writes and updates your app. Mixing them up wastes credits and time.',
    how: 'Stuck on “how do I export?” → ? / Tips / Support. Want a new screen or feature → Builder prompt → Generate.',
    href: '/docs',
    hrefLabel: 'Docs home',
    featured: true,
  },
  {
    id: 'ai-help-assistant',
    section: 'ai-helpers',
    title: 'Ask HelpAssistant for product how-tos',
    when: 'You need an answer about NiskBuild itself (plans, export, settings).',
    why: 'It’s trained on platform guidance — not for inventing your app’s UI.',
    how: 'Open help from the header or Support, ask a concrete question, then follow any linked docs it cites.',
    href: '/dashboard/support',
    hrefLabel: 'Support',
  },
  {
    id: 'ai-builder-codegen',
    section: 'ai-helpers',
    title: 'Codegen belongs in the Builder prompt',
    when: 'You want pages, flows, or logic created or changed.',
    why: 'Only Builder Generate mutates your project files and preview.',
    how: 'Describe the change in the Builder → Generate → review preview → save. Use Plan mode on eligible plans for multi-step roadmaps.',
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
