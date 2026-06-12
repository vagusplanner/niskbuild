import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

/** Report a caught API error to Sentry. */
export function captureApiException(error: unknown): void {
  Sentry.captureException(error);
}

/** Capture the error and return a standard JSON error response. */
export function apiErrorResponse(
  error: unknown,
  message = 'Something went wrong',
  status = 500
): NextResponse {
  Sentry.captureException(error);
  return NextResponse.json({ error: message }, { status });
}
