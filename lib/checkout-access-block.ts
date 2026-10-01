import { NextResponse } from 'next/server';
import { hasComplimentaryProductAccess } from '@/lib/access-grant';

export const ALREADY_HAVE_ACCESS_MESSAGE =
  'You already have access. Checkout is not available for platform owners or complementary accounts.';

/** Block Stripe subscription checkout for platform owners and active admin_comped. */
export async function checkoutBlockedForComplimentaryAccess(
  userId: string
): Promise<NextResponse | null> {
  if (!(await hasComplimentaryProductAccess(userId))) return null;
  return NextResponse.json(
    { error: ALREADY_HAVE_ACCESS_MESSAGE, code: 'ALREADY_HAVE_ACCESS' },
    { status: 403 }
  );
}
