export type ExportJobStatus = 'building' | 'syncing' | 'ready_for_xcode' | 'failed';

export type BuilderExportAppConfig = {
  /** Builder route slug, e.g. vagus-planner */
  appSlug: string;
  /** Human name for logs */
  displayName: string;
  /** Relative path from repo root, e.g. apps/vagus-planner */
  packageDir: string;
  /** Build output folder inside packageDir */
  distDir: string;
  /** Capacitor project root, e.g. mobile/vagus-planner */
  capacitorDir: string;
  /** app_registry.app_name lookup */
  registryAppName: string;
  capacitorAppId: string;
  capacitorAppName: string;
  buildEnv?: Record<string, string>;
};

export type ExportJobRecord = {
  id: string;
  app_slug: string;
  requested_by: string | null;
  status: ExportJobStatus;
  log: string;
  capacitor_root: string | null;
  ios_workspace: string | null;
  started_at: string;
  finished_at: string | null;
};

export type AppStoreChecklist = {
  appSlug: string;
  appName: string;
  bundleId: string | null;
  bundleIdSet: boolean;
  appIconUrl: string | null;
  appIconUploaded: boolean;
  privacyPolicyUrl: string | null;
  privacyPolicySet: boolean;
  screenshotCount: number;
  appStoreScreenshotsUploaded: boolean;
  appStoreConnectUrl: string | null;
};
