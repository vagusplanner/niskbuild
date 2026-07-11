export type TenantBrand = {
  orgId: string;
  /** Display name: custom brand_app_name, else org workspace name */
  appName: string | null;
  /** Only the configured brand_app_name column (null if unset) */
  customAppName: string | null;
  logoUrl: string | null;
  /** True only when billing owner is White-Label+ AND preference allows (Option B + defense). */
  hideAttribution: boolean;
  ownerTier: string;
  ownerStatus: string;
};

/** True when the org saved a logo and/or custom app name (not just org workspace fallback). */
export function hasCustomTenantBranding(brand: TenantBrand | null | undefined): boolean {
  if (!brand) return false;
  return !!(brand.logoUrl || brand.customAppName);
}

/** Browser tab title on custom domains — brand takes priority. */
export function tenantDocumentTitle(
  brand: TenantBrand | null | undefined,
  projectTitle?: string | null,
  fallback = 'App'
): string {
  const brandName =
    brand?.customAppName?.trim() || brand?.appName?.trim() || null;
  const project =
    typeof projectTitle === 'string' && projectTitle.trim()
      ? projectTitle.trim()
      : null;

  if (brandName && project && project !== brandName) {
    return `${brandName} · ${project}`;
  }
  if (brandName) return brandName;
  if (project) return project;
  return fallback;
}

/** Effective display name for custom-domain chrome. */
export function tenantDisplayName(
  brand: TenantBrand | null,
  fallback = 'NiskBuild'
): string {
  return brand?.customAppName?.trim() || brand?.appName?.trim() || fallback;
}
