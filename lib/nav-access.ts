import { hasPaidTier } from '@/lib/access';
import { isPaidAndActive } from '@/lib/tier-config';
import type { NavItem } from '@/lib/nav-config';
import { OVERFLOW_NAV } from '@/lib/nav-config';

export type AccountGateProfile = {
  subscription_tier?: string | null;
  subscription_status?: string | null;
  phone_verified?: boolean | null;
};

/** Matches middleware: paid subscribers skip phone verify; free users need phone_verified. */
export function hasFullNavAccess(profile: AccountGateProfile): boolean {
  const tier = profile.subscription_tier ?? 'free';
  const status = profile.subscription_status ?? 'inactive';
  if (isPaidAndActive(tier, status)) return true;
  return profile.phone_verified === true;
}

const VERIFY_FIRST_HREFS = new Set([
  '/docs',
  '/brand',
  '/dashboard/settings',
  '/pricing',
]);

/** Paths the command palette may link to before full nav access. */
const VERIFY_FIRST_PALETTE_PREFIXES = [
  '/verify-phone',
  '/docs',
  '/brand',
  '/dashboard/settings',
  '/pricing',
] as const;

export function isPaletteDestinationAllowed(href: string, fullAccess: boolean): boolean {
  if (fullAccess) return true;
  const path = href.split('?')[0];
  return VERIFY_FIRST_PALETTE_PREFIXES.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`)
  );
}

export function paletteItemAllowed(
  item: { href?: string },
  fullAccess: boolean
): boolean {
  if (fullAccess) return true;
  if (!item.href) return false;
  return isPaletteDestinationAllowed(item.href, false);
}

export const VERIFY_FIRST_OVERFLOW_NAV: NavItem[] = OVERFLOW_NAV.filter((item) =>
  VERIFY_FIRST_HREFS.has(item.href)
);

export const VERIFY_PHONE_NAV_ITEM: NavItem = {
  href: '/verify-phone',
  label: 'Verify phone',
  icon: '📱',
  description: 'Unlock Builder & Dashboard',
};

export function overflowNavForAccount(
  profile: AccountGateProfile
): NavItem[] {
  if (hasFullNavAccess(profile)) return OVERFLOW_NAV;
  const needsPhone =
    !isPaidAndActive(profile.subscription_tier, profile.subscription_status) &&
    profile.phone_verified !== true;
  return needsPhone
    ? [VERIFY_PHONE_NAV_ITEM, ...VERIFY_FIRST_OVERFLOW_NAV]
    : VERIFY_FIRST_OVERFLOW_NAV;
}
