import { hasPaidTier, isPublicPath } from '@/lib/access';

export type PostAuthProfile = {
  subscription_tier?: string | null;
  subscription_status?: string | null;
  phone_verified?: boolean | null;
};

/** Safe internal path only — blocks open redirects. */
export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

/**
 * After sign-in/sign-up:
 * 1. Phone verify if unpaid and not verified
 * 2. Unpaid users → /pricing (choose a plan) unless `next` is pricing/login/public
 * 3. Paid users → requested `next` or /dashboard
 */
export function resolvePostAuthPath(
  profile: PostAuthProfile,
  requestedNext?: string | null
): string {
  const paid =
    hasPaidTier(profile.subscription_tier ?? undefined) &&
    profile.subscription_status === 'active';

  const safeNext = sanitizeNextPath(requestedNext);

  if (safeNext?.startsWith('/reset-password')) {
    return safeNext;
  }

  if (!paid && !profile.phone_verified) {
    if (safeNext?.startsWith('/verify-phone')) return safeNext;
    return '/verify-phone';
  }

  if (!paid) {
    if (
      safeNext &&
      (safeNext.startsWith('/pricing') ||
        safeNext.startsWith('/login') ||
        isPublicPath(safeNext.split('?')[0]))
    ) {
      return safeNext;
    }
    return '/pricing?welcome=1';
  }

  if (safeNext && !isPublicPath(safeNext.split('?')[0])) {
    return safeNext;
  }

  return '/dashboard';
}
