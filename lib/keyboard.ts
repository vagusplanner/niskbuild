/** Platform-aware shortcut labels for help UI */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export function modKey(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl';
}

export function shortcut(mod: string, key: string): string {
  return `${mod}${key}`;
}
