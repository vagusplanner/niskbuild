export type TenantBrand = {
  orgId: string;
  appName: string | null;
  logoUrl: string | null;
  /** True only when billing owner is White-Label+ AND preference allows (Option B + defense). */
  hideAttribution: boolean;
  ownerTier: string;
  ownerStatus: string;
};

/** Effective display name for custom-domain chrome. */
export function tenantDisplayName(
  brand: TenantBrand | null,
  fallback = 'NiskBuild'
): string {
  return brand?.appName?.trim() || fallback;
}
