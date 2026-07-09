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

const VERIFY_FIRST_HREFS = new Set(['/dashboard/settings', '/pricing']);

export function isPaletteDestinationAllowed(href: string, fullAccess: boolean): boolean {
  if (fullAccess) return true;
  const path = href.split('?')[0];
  if (VERIFY_FIRST_HREFS.has(path)) return true;
  return path.startsWith('/dashboard/settings/');
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

export function overflowNavForAccount(profile: AccountGateProfile): NavItem[] {
  if (hasFullNavAccess(profile)) return OVERFLOW_NAV;
  return VERIFY_FIRST_OVERFLOW_NAV;
}
