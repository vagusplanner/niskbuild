/** 20-item theme bank for Social Hub content rotation */

export type SocialTheme = {
  id: string;
  title: string;
  hook: string;
  platforms: ('instagram' | 'linkedin' | 'twitter' | 'facebook')[];
};

export const SOCIAL_THEME_BANK: SocialTheme[] = [
  { id: 'builder-win', title: 'Builder win', hook: 'Shipped in 15 minutes — here’s what changed', platforms: ['linkedin', 'twitter'] },
  { id: 'before-after', title: 'Before / after', hook: 'Prompt → live preview → export', platforms: ['instagram', 'linkedin'] },
  { id: 'tip-prompt', title: 'Prompt tip', hook: 'One line that makes NiskBuild outputs cleaner', platforms: ['twitter', 'linkedin'] },
  { id: 'template-drop', title: 'Template drop', hook: 'New template in the marketplace', platforms: ['instagram', 'twitter'] },
  { id: 'ugc-spotlight', title: 'UGC spotlight', hook: 'Built by a NiskBuild user — repost with permission', platforms: ['instagram', 'linkedin'] },
  { id: 'docs-deep-dive', title: 'Docs deep dive', hook: 'Your first 15 minutes — step-by-step', platforms: ['linkedin'] },
  { id: 'pricing-value', title: 'Value prop', hook: 'Own your code, skip vendor lock-in', platforms: ['linkedin', 'twitter'] },
  { id: 'game-template', title: 'Game template', hook: 'Agency-tier game builder showcase', platforms: ['instagram', 'twitter'] },
  { id: 'google-import', title: 'Google import', hook: 'Business site from Google Places in one click', platforms: ['linkedin'] },
  { id: 'copper-brand', title: 'Brand story', hook: 'Forged iron & melted copper — why this palette', platforms: ['instagram'] },
  { id: 'changelog', title: 'Changelog', hook: 'What we shipped this week', platforms: ['twitter', 'linkedin'] },
  { id: 'founder-note', title: 'Founder note', hook: 'Why we built NiskBuild', platforms: ['linkedin'] },
  { id: 'compare-manual', title: 'Manual vs AI', hook: 'Hours of scaffolding vs one prompt', platforms: ['twitter'] },
  { id: 'export-own', title: 'Export & own', hook: 'ZIP, GitHub, PWA — you own everything', platforms: ['linkedin'] },
  { id: 'marketplace', title: 'Marketplace', hook: 'Sell templates, earn on NiskBuild', platforms: ['linkedin', 'instagram'] },
  { id: 'social-pro', title: 'Social Pro', hook: 'Schedule posts straight from the builder', platforms: ['twitter'] },
  { id: 'community-poll', title: 'Poll', hook: 'What should we template next?', platforms: ['twitter', 'linkedin'] },
  { id: 'tutorial-short', title: 'Short tutorial', hook: '30-second screen capture walkthrough', platforms: ['instagram', 'linkedin'] },
  { id: 'partner-shout', title: 'Partner shout', hook: 'Co-marketing with an integration partner', platforms: ['linkedin'] },
  { id: 'milestone', title: 'Milestone', hook: 'Users, exports, or revenue milestone', platforms: ['linkedin', 'twitter'] },
];

export function themeById(id: string): SocialTheme | undefined {
  return SOCIAL_THEME_BANK.find((t) => t.id === id);
}
