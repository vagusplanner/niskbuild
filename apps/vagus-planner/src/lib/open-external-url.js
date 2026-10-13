/** Apple Standard EULA (Guideline 3.1.2). */
export const APPLE_STANDARD_EULA_URL =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Canonical public Privacy Policy. */
export const VP_PUBLIC_PRIVACY_URL = 'https://vagusplanner.com/privacy';

/**
 * Open an https URL outside the Cap WebView (Safari / system browser).
 * Matches existing app pattern (window.open … '_blank') so Back stays in-app.
 */
export function openExternalUrl(url) {
  if (!url || typeof url !== 'string') return;
  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) return;
  } catch {
    /* fall through */
  }
  // Some WebViews block window.open — create a transient anchor instead.
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.warn('[openExternalUrl] failed:', err?.message || err);
  }
}
