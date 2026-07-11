/** Format a duration for admin TTFR display (e.g. "2h 15m"). */
export function formatDurationMs(ms: number): string {
  const totalMins = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Observational time-to-first-response label for admin ticket UI.
 * No SLA enforcement — visibility only.
 */
export function formatTimeToFirstResponse(
  createdAt: string,
  firstResponseAt: string | null | undefined,
  nowMs: number = Date.now()
): string {
  if (firstResponseAt) {
    const ms =
      new Date(firstResponseAt).getTime() - new Date(createdAt).getTime();
    return `Responded in ${formatDurationMs(ms)}`;
  }
  const ms = nowMs - new Date(createdAt).getTime();
  return `Awaiting response — ${formatDurationMs(ms)} so far`;
}
