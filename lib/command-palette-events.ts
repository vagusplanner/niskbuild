export const COMMAND_PALETTE_OPEN_EVENT = 'niskbuild:command-palette-open';
export const SHORTCUTS_MODAL_OPEN_EVENT = 'niskbuild:shortcuts-modal-open';
export const BUILDER_EXPORT_EVENT = 'niskbuild:builder-export';
export const BUILDER_NEW_PROJECT_EVENT = 'niskbuild:builder-new-project';

const RECENT_KEY = 'niskbuild_cmdk_recent';
const RECENT_MAX = 5;

export type RecentPaletteItem = {
  id: string;
  label: string;
  section: string;
  href?: string;
  action?: 'template' | 'project';
  projectId?: string;
  templatePrompt?: string;
};

export function openCommandPalette() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
}

export function pushRecentPaletteItem(item: RecentPaletteItem) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const prev: RecentPaletteItem[] = raw ? JSON.parse(raw) : [];
    const next = [item, ...prev.filter((p) => p.id !== item.id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export function getRecentPaletteItems(): RecentPaletteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentPaletteItem[]) : [];
  } catch {
    return [];
  }
}
