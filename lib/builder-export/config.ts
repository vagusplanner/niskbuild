import 'server-only';

import type { BuilderExportAppConfig } from '@/lib/builder-export/types';
import { getBuilderApp } from '@/lib/builder-apps/registry';

const EXPORT_CONFIGS: Record<string, BuilderExportAppConfig> = {
  'vagus-planner': {
    appSlug: 'vagus-planner',
    displayName: 'Vagus Planner',
    packageDir: 'apps/vagus-planner',
    distDir: 'dist',
    capacitorDir: 'mobile/vagus-planner',
    registryAppName: 'Vagus Planner',
    capacitorAppId: 'com.niskbuild.vagusplanner',
    capacitorAppName: 'Vagus Planner',
    buildEnv: { CAPACITOR_BUILD: '1' },
  },
};

export function getBuilderExportConfig(appSlug: string): BuilderExportAppConfig | null {
  if (EXPORT_CONFIGS[appSlug]) {
    return EXPORT_CONFIGS[appSlug];
  }

  const app = getBuilderApp(appSlug);
  if (!app) return null;

  return {
    appSlug,
    displayName: app.name,
    packageDir: `apps/${appSlug}`,
    distDir: 'dist',
    capacitorDir: `mobile/${appSlug}`,
    registryAppName: app.name,
    capacitorAppId: `com.niskbuild.${appSlug.replace(/-/g, '')}`,
    capacitorAppName: app.name,
    buildEnv: { CAPACITOR_BUILD: '1' },
  };
}

export function isExportSupported(appSlug: string): boolean {
  const app = getBuilderApp(appSlug);
  return !!app?.supportsXcodeExport && !!getBuilderExportConfig(appSlug);
}
