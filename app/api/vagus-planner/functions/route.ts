import { NextRequest, NextResponse } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { dispatchVpFunction } from '@/lib/vp-functions/dispatch';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 30 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const functionName =
      typeof body.function === 'string' ? body.function.trim() : '';
    if (!functionName) {
      return NextResponse.json({ error: 'function is required' }, { status: 400 });
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
      return NextResponse.json(
        { error: 'Not implemented', function: functionName },
        { status: 501 }
      );
    }

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    captureApiException(error);
    const message =
      error instanceof Error ? error.message : 'Function invocation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
