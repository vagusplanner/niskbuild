/** Builder generation performance telemetry (client + server types). */

export type BuildPerformanceSource = 'cloud_stream' | 'local_ollama' | 'cloud_stream_server';

export type BuildPerformanceMetrics = {
  source: BuildPerformanceSource;
  ttfcMs: number | null;
  durationMs: number;
  success: boolean;
  codeChars?: number;
};

export const BUILD_PERF_LOG_PREFIX = '[niskbuild:build-perf]';

/** Client-side: POST anonymized timing to the server (fire-and-forget). */
export function reportBuildPerformance(metrics: BuildPerformanceMetrics): void {
  if (typeof window === 'undefined') return;

  try {
    void fetch('/api/build-performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(metrics),
      keepalive: true,
    });
  } catch {
    /* non-blocking */
  }
}
