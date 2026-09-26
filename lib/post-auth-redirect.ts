import { hasPaidTier, isPublicPath } from '@/lib/access';
import { isSuperEduc8Host } from '@/lib/supereduc8-host';

export type PostAuthProfile = {
  subscription_tier?: string | null;
  subscription_status?: string | null;
  phone_verified?: boolean | null;
};

export type PostAuthProduct = 'niskbuild' | 'supereduc8';

/** Safe internal path only — blocks open redirects. */
export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

/** Infer product from a request host or absolute origin (auth callback / redirects). */
export function resolvePostAuthProduct(
  hostOrOrigin: string | null | undefined
): PostAuthProduct {
  if (!hostOrOrigin) return 'niskbuild';
  try {
    const host = hostOrOrigin.includes('://')
      ? new URL(hostOrOrigin).hostname
      : hostOrOrigin.split(':')[0];
    return isSuperEduc8Host(host) ? 'supereduc8' : 'niskbuild';
  } catch {
    return 'niskbuild';
  }
}

/**
 * After sign-in/sign-up:
 * - SuperEduc8: never require NiskBuild Sandbox phone verify; never funnel to
 *   NiskBuild /pricing. Age/parental consent is handled by SE8 signup flows.
 * - NiskBuild: phone verify if unpaid and not verified, else pricing or next.
 */
export function resolvePostAuthPath(
  profile: PostAuthProfile,
  requestedNext?: string | null,
  options?: { isPlatformOwner?: boolean; product?: PostAuthProduct }
): string {
  const product = options?.product ?? 'niskbuild';
  const safeNext = sanitizeNextPath(requestedNext);

  if (safeNext?.startsWith('/reset-password')) {
    return safeNext;
  }

  if (product === 'supereduc8') {
    if (options?.isPlatformOwner) {
      if (
        safeNext &&
        !safeNext.startsWith('/verify-phone') &&
        !isPublicPath(safeNext.split('?')[0])
      ) {
        return safeNext;
      }
      return '/dashboard';
    }

    // Drop stale NiskBuild phone/pricing destinations from shared auth.
    if (
      safeNext &&
      !safeNext.startsWith('/verify-phone') &&
      !safeNext.startsWith('/pricing') &&
      !isPublicPath(safeNext.split('?')[0])
    ) {
      return safeNext;
    }
    return '/dashboard';
  }

  const paid =
    hasPaidTier(profile.subscription_tier ?? undefined) &&
    profile.subscription_status === 'active';

  if (options?.isPlatformOwner) {
    if (
      safeNext &&
      !safeNext.startsWith('/verify-phone') &&
      !isPublicPath(safeNext.split('?')[0])
    ) {
      return safeNext;
    }
    return '/dashboard';
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
