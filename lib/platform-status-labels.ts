/** Client-safe labels for public status page (no server-only imports). */

export type PlatformStatusValue = 'operational' | 'degraded' | 'down';

export function statusLabel(status: PlatformStatusValue): string {
  if (status === 'operational') return 'Operational';
  if (status === 'degraded') return 'Degraded';
  return 'Down';
}
