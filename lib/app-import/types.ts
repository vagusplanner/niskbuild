export type AppImportStatus = 'pending' | 'extracting' | 'normalizing' | 'completed' | 'failed';

export type AppSourceLayer = 'firstparty' | 'subscriber';

export type DetectedFramework = 'vite' | 'next' | 'cra' | 'static' | 'unknown';

export type NiskBuildImportManifest = {
  version: '1.0';
  slug: string;
  title: string;
  framework: DetectedFramework;
  /** Object path in imported-apps bucket, e.g. my-app/source.zip */
  storagePath: string;
  storageBucket: 'imported-apps';
  sourceLayer: AppSourceLayer;
  importedAt: string;
  entryFiles: string[];
  features: {
    socialPublisher: boolean;
    previewSwitcher: boolean;
    appStoreChecklist: boolean;
    multiTenantRouting: boolean;
  };
  envKeys: string[];
};

export type AppImportInput = {
  title: string;
  description?: string;
  priceCents?: number;
  sourceLayer?: AppSourceLayer;
  publishActive?: boolean;
  registerFirstparty?: boolean;
};

export type AppImportResult = {
  importId: string;
  slug: string;
  title: string;
  status: AppImportStatus;
  framework: DetectedFramework;
  storagePath: string;
  listingId: string | null;
  appRegistryId: string | null;
  manifest: NiskBuildImportManifest;
  log: string;
};
