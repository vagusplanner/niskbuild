import { NextRequest, NextResponse } from 'next/server';
import { appUrl } from '@/lib/email/app-url';

/**
 * Legacy Buffer OAuth callback — customer connect is deferred.
 * Do not exchange codes; clear any in-flight OAuth noise with a roadmap message.
 */
export async function GET() {
  return NextResponse.redirect(
    `${appUrl('/dashboard/settings')}?buffer=coming_soon`
  );
}
