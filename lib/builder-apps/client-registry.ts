/** Client-safe builder app metadata (no filesystem / server-only imports). */

export type ClientBuilderAppMeta = {
  id: string;
  name: string;
  studioLabel: string;
  srcRoot: string;
  previewUrl: string;
  /** Next.js path for iframe embed (same as app/vagus-planner/page.tsx) */
  previewEmbedPath?: string;
  defaultTargetId: string;
  openAppHref: string;
  deployTitle: string;
};

const VAGUS_PLANNER_PREVIEW_URL =
  process.env.NEXT_PUBLIC_VAGUS_PLANNER_URL?.trim() || 'http://localhost:5175';

export const CLIENT_BUILDER_APPS: Record<string, ClientBuilderAppMeta> = {
  'vagus-planner': {
    id: 'vagus-planner',
    name: 'Vagus Planner',
    studioLabel: 'First-party builder',
    srcRoot: 'apps/vagus-planner/src',
    previewUrl: VAGUS_PLANNER_PREVIEW_URL,
    previewEmbedPath: '/vagus-planner',
    defaultTargetId: 'Dashboard',
    openAppHref: '/vagus-planner',
    deployTitle: 'Vagus Planner',
  },
};

export function getClientBuilderApp(appId: string): ClientBuilderAppMeta | null {
  return CLIENT_BUILDER_APPS[appId] ?? null;
}

export function isClientBuilderAppId(appId: string): boolean {
  return appId in CLIENT_BUILDER_APPS;
}
