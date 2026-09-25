/**
 * Full App live preview — esbuild-wasm + curated CDN vendors.
 */

export {
  FULL_APP_PREVIEW_VENDOR,
  FULL_APP_PREVIEW_EXTERNALS,
  buildPreviewImportMap,
  isAllowedBareImport,
} from '@/lib/full-app-preview/allowlist';

export {
  bundleFullAppPreview,
  findPreviewEntry,
  collectPreviewCss,
  findDisallowedImports,
  rewriteBrowserRouterForPreview,
  injectPreviewNavBridge,
  type FullAppPreviewFiles,
  type FullAppBundleResult,
  type EsbuildApi,
} from '@/lib/full-app-preview/bundle';

export {
  buildFullAppPreviewHtml,
  type PreviewShellOptions,
} from '@/lib/full-app-preview/shell';

export {
  ensureEsbuildInitialized,
  getEsbuild,
  type EnsureEsbuildOptions,
} from '@/lib/full-app-preview/esbuild-init';
