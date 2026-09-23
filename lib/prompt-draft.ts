/**
 * HTML builder prompt draft — local-only persistence (v1).
 * Keys: niskbuild_prompt_draft:{projectId|'new'}
 * Opt-out: niskbuild_prompt_autosave === '0' (default ON)
 */

import {
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
} from '@/lib/safe-storage';

const AUTOSAVE_FLAG_KEY = 'niskbuild_prompt_autosave';
const DRAFT_PREFIX = 'niskbuild_prompt_draft:';

export function promptDraftStorageKey(
  projectId: string | null | undefined
): string {
  const id = projectId?.trim();
  return `${DRAFT_PREFIX}${id || 'new'}`;
}

/** Default ON — only disabled when flag is explicitly '0'. */
export function isPromptAutosaveEnabled(): boolean {
  return safeLocalStorageGet(AUTOSAVE_FLAG_KEY) !== '0';
}

export function setPromptAutosaveEnabled(enabled: boolean): void {
  if (enabled) {
    safeLocalStorageRemove(AUTOSAVE_FLAG_KEY);
  } else {
    safeLocalStorageSet(AUTOSAVE_FLAG_KEY, '0');
  }
}

export function loadPromptDraft(
  projectId: string | null | undefined
): string | null {
  const raw = safeLocalStorageGet(promptDraftStorageKey(projectId));
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed ? raw : null;
}

export function savePromptDraft(
  projectId: string | null | undefined,
  prompt: string
): void {
  if (!isPromptAutosaveEnabled()) return;
  const key = promptDraftStorageKey(projectId);
  if (!prompt.trim()) {
    safeLocalStorageRemove(key);
    return;
  }
  safeLocalStorageSet(key, prompt);
}

export function clearPromptDraft(
  projectId: string | null | undefined
): void {
  safeLocalStorageRemove(promptDraftStorageKey(projectId));
}
