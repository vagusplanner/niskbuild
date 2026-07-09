import 'server-only';

import type { BuildPerformanceMetrics } from '@/lib/build-performance';
import { BUILD_PERF_LOG_PREFIX } from '@/lib/build-performance';

/** Structured server log for log drains / future aggregation (no PII). */
export function logBuildPerformance(
  userId: string,
  metrics: BuildPerformanceMetrics
): void {
  console.info(
    BUILD_PERF_LOG_PREFIX,
    JSON.stringify({
      userIdPrefix: userId.slice(0, 8),
      ...metrics,
      recordedAt: new Date().toISOString(),
    })
  );
}
