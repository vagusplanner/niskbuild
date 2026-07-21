/**
 * Static catalog of NiskBuild's own first-party products.
 *
 * Distinct from:
 * - `lib/builder-apps/registry.ts` — AI studio source-editing targets (VP only today)
 * - `firstparty.app_registry` — DB rows for imported / marketplace-registered apps
 */

export type FirstPartyAppStatus = 'live' | 'in_development' | 'internal';

export type FirstPartyAppAction = {
  id: string;
  label: string;
  href: string;
  /** Primary CTA styling */
  variant?: 'primary' | 'secondary';
  external?: boolean;
};

export type FirstPartyApp = {
  id: string;
  name: string;
  shortDescription: string;
  status: FirstPartyAppStatus;
  /** Emoji or short glyph used as card thumbnail when no image is available */
  icon: string;
  /** Live / customer-facing entry */
  openHref: string;
  /**
   * Builder / studio editing surface when one exists.
   * Omit when the product has no AI studio (e.g. Shift AI today).
   */
  editHref?: string;
  editLabel?: string;
  /** Extra admin surfaces already elsewhere in the product */
  actions: FirstPartyAppAction[];
  /**
   * Hard delete is never offered for first-party products — they are platform code,
   * not customer projects. Use archive/deactivate only if a product-level flag exists.
   */
  supportsDelete: false;
};

export const FIRST_PARTY_APPS: FirstPartyApp[] = [
  {
    id: 'vagus-planner',
    name: 'Vagus Planner',
    shortDescription:
      'Muslim-focused life planner SPA — calendar, prayer, AI scheduling, billing, and Islamic edition.',
    status: 'live',
    icon: '📅',
    openHref: '/vagus-planner',
    editHref: '/builder/vagus-planner',
    editLabel: 'Open studio',
    actions: [
      {
        id: 'deploy',
        label: 'VP Deploy',
        href: '/admin/vp-deploy',
        variant: 'secondary',
      },
      {
        id: 'export',
        label: 'Export',
        href: '/builder/vagus-planner/export',
        variant: 'secondary',
      },
    ],
    supportsDelete: false,
  },
  {
    id: 'shift-ai',
    name: 'Shift AI',
    shortDescription:
      'Education product for students, parents, and teachers — tutoring, homework, curriculum packs, and classroom tools.',
    status: 'live',
    icon: '🎓',
    openHref: '/builder/shift-ai',
    editHref: '/builder/shift-ai/studio',
    editLabel: 'Open studio',
    actions: [
      {
        id: 'analytics',
        label: 'In-app analytics',
        href: '/builder/shift-ai/analytics',
        variant: 'secondary',
      },
      {
        id: 'teacher',
        label: 'Teacher tools',
        href: '/builder/shift-ai/teacher',
        variant: 'secondary',
      },
    ],
    supportsDelete: false,
  },
];

export function listFirstPartyApps(): FirstPartyApp[] {
  return FIRST_PARTY_APPS;
}

export function getFirstPartyApp(id: string): FirstPartyApp | undefined {
  return FIRST_PARTY_APPS.find((app) => app.id === id);
}

export function firstPartyStatusLabel(status: FirstPartyAppStatus): string {
  switch (status) {
    case 'live':
      return 'Live';
    case 'in_development':
      return 'In Development';
    case 'internal':
      return 'Internal';
    default:
      return status;
  }
}
