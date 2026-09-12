import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { ensureProfileForUser } from '@/lib/ensure-profile';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

/**
 * Idempotent: create public.profiles for the authenticated VP user if missing.
 * Called after signup / on first authenticated session so Stripe webhooks can
 * attach billing to the same user id.
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return withVpApiCors(request, guard.response);

  try {
    const user = guard.user!;
    const result = await ensureProfileForUser({
      userId: user.id,
      email: user.email,
      fullName:
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : null,
    });

    if (!result) {
      return withVpApiCors(
        request,
        vpApiJson(
          request,
          {
            error:
              'Could not create your billing profile. Check that your account email is verified, then refresh and try again. If this keeps failing, contact support.',
          },
          { status: 500 }
        )
      );
    }

    return withVpApiCors(
      request,
      vpApiJson(request, {
        ok: true,
        created: result.created,
        profileId: result.id,
      })
    );
  } catch (err) {
    captureApiException(err);
    return withVpApiCors(
      request,
      vpApiJson(
        request,
        { error: 'Failed to ensure billing profile' },
        { status: 500 }
      )
    );
  }
}
