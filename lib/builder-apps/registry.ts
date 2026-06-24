import type { BuilderAppDefinition } from '@/lib/builder-apps/types';
import { vagusPlannerApp } from '@/lib/builder-apps/vagus-planner';

const BUILDER_APPS: Record<string, BuilderAppDefinition> = {
  [vagusPlannerApp.id]: vagusPlannerApp,
};

export function getBuilderApp(appId: string): BuilderAppDefinition | null {
  return BUILDER_APPS[appId] ?? null;
}

export function listBuilderApps(): BuilderAppDefinition[] {
  return Object.values(BUILDER_APPS);
}

export function isBuilderAppId(appId: string): boolean {
  return appId in BUILDER_APPS;
}
