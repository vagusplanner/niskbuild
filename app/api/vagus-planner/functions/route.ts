import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';
import { dispatchVpFunction } from '@/lib/vp-functions/dispatch';

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 30 });
  if (!guard.ok) return withVpApiCors(request, guard.response);

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return vpApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
    }

    const functionName =
      typeof body.function === 'string' ? body.function.trim() : '';
    if (!functionName) {
      return vpApiJson(request, { error: 'function is required' }, { status: 400 });
    }

    const payload =
      body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
        ? (body.payload as Record<string, unknown>)
        : {};

    const result = await dispatchVpFunction(functionName, {
      request,
      user: guard.user!,
      payload,
    });

    if (result === null) {
      return vpApiJson(
        request,
        { error: 'Not implemented', function: functionName },
        { status: 501 }
      );
    }

    if (!result.ok) {
      return vpApiJson(request, { error: result.error }, { status: result.status ?? 400 });
    }

    return vpApiJson(request, { data: result.data });
  } catch (error) {
    captureApiException(error);
    const message =
      error instanceof Error ? error.message : 'Function invocation failed';
    return vpApiJson(request, { error: message }, { status: 500 });
  }
}
