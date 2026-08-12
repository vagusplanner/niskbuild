import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { logBuildPerformance } from '@/lib/build-performance-server';
import type { BuildPerformanceMetrics } from '@/lib/build-performance';

/** Lightweight build timing telemetry — structured server logs, no prompt text stored. */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 60 });
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Partial<BuildPerformanceMetrics>;
  const durationMs = typeof body.durationMs === 'number' ? Math.round(body.durationMs) : null;
  if (durationMs === null || durationMs < 0 || durationMs > 600_000) {
    return NextResponse.json({ error: 'Invalid durationMs' }, { status: 400 });
  }

  const ttfcMs =
    typeof body.ttfcMs === 'number' && body.ttfcMs >= 0 && body.ttfcMs <= 600_000
      ? Math.round(body.ttfcMs)
      : null;

  const source = body.source;
  if (source !== 'cloud_stream' && source !== 'local_ollama' && source !== 'cloud_stream_server') {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  }

  const progressSource =
    body.progressSource === 'markers' ||
    body.progressSource === 'heuristic' ||
    body.progressSource === 'none'
      ? body.progressSource
      : undefined;
  const markerCount =
    typeof body.markerCount === 'number' &&
    body.markerCount >= 0 &&
    body.markerCount <= 50
      ? Math.round(body.markerCount)
      : undefined;

  logBuildPerformance(guard.user.id, {
    source,
    ttfcMs,
    durationMs,
    success: body.success === true,
    codeChars: typeof body.codeChars === 'number' ? body.codeChars : undefined,
    progressSource,
    markerCount,
  });

  return NextResponse.json({ ok: true });
}
