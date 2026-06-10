/** Client-side device fingerprint inputs (hashed server-side). */

export function buildDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const parts = [
    navigator.userAgent,
    `${window.screen.width}x${window.screen.height}`,
    String(window.screen.colorDepth),
    navigator.language,
  ];

  return parts.join('|');
}
