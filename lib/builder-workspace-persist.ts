/**
 * Local workspace persistence for the HTML builder.
 * Complements DB project save — used to resume after navigation and as a
 * safety net when cloud save fails (e.g. free-tier project limit).
 */

import {
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
} from '@/lib/safe-storage';
import type { ProjectFile } from '@/lib/project-files';

export const BUILDER_ACTIVE_PROJECT_KEY = 'niskbuild_active_project_id';
export const BUILDER_WORKSPACE_SNAPSHOT_KEY = 'niskbuild_workspace_snapshot';
/** Legacy single-code key (also used by GitHub settings); keep in sync. */
export const BUILDER_CURRENT_CODE_KEY = 'niskbuild_current_code';

export type BuilderWorkspaceSnapshot = {
  generatedCode: string;
  prompt: string;
  activeFile: string;
  projectFiles: ProjectFile[];
  projectId: string | null;
  updatedAt: string;
  /** simple = HTML; full-app = React+Vite multi-file */
  outputMode?: 'simple' | 'full-app';
};

export function deriveProjectTitle(prompt: string): string {
  // Prefer the user-facing slice if a multi-page AI wrapper was persisted by mistake.
  let text = prompt.trim();
  const marker = '\nUser request:\n';
  if (text.startsWith('MULTI-PAGE PROJECT') && text.includes(marker)) {
    text = text.slice(text.lastIndexOf(marker) + marker.length).trim();
  }
  const trimmed = text.replace(/\s+/g, ' ');
  if (!trimmed) return 'Untitled Project';
  return trimmed.length > 50 ? `${trimmed.slice(0, 50).trimEnd()}…` : trimmed;
}

export function setActiveProjectIdLocal(projectId: string | null): void {
  if (projectId?.trim()) {
    safeLocalStorageSet(BUILDER_ACTIVE_PROJECT_KEY, projectId.trim());
  } else {
    safeLocalStorageRemove(BUILDER_ACTIVE_PROJECT_KEY);
  }
}

export function getActiveProjectIdLocal(): string | null {
  const id = safeLocalStorageGet(BUILDER_ACTIVE_PROJECT_KEY)?.trim();
  return id || null;
}

export function saveWorkspaceSnapshot(snapshot: BuilderWorkspaceSnapshot): void {
  if (!snapshot.generatedCode.trim()) {
    clearWorkspaceSnapshot();
    return;
  }
  safeLocalStorageSet(BUILDER_WORKSPACE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  safeLocalStorageSet(BUILDER_CURRENT_CODE_KEY, snapshot.generatedCode);
  setActiveProjectIdLocal(snapshot.projectId);
}

export function loadWorkspaceSnapshot(): BuilderWorkspaceSnapshot | null {
  const raw = safeLocalStorageGet(BUILDER_WORKSPACE_SNAPSHOT_KEY);
  if (!raw) {
    // Legacy fallback: code-only key
    const code = safeLocalStorageGet(BUILDER_CURRENT_CODE_KEY);
    if (!code?.trim()) return null;
    return {
      generatedCode: code,
      prompt: '',
      activeFile: 'index.html',
      projectFiles: [],
      projectId: getActiveProjectIdLocal(),
      updatedAt: new Date(0).toISOString(),
    };
  }
  try {
    const parsed = JSON.parse(raw) as BuilderWorkspaceSnapshot;
    if (!parsed?.generatedCode?.trim()) return null;
    return {
      generatedCode: parsed.generatedCode,
      prompt: typeof parsed.prompt === 'string' ? parsed.prompt : '',
      activeFile: parsed.activeFile || 'index.html',
      projectFiles: Array.isArray(parsed.projectFiles) ? parsed.projectFiles : [],
      projectId: parsed.projectId ?? getActiveProjectIdLocal(),
      updatedAt: parsed.updatedAt || new Date(0).toISOString(),
      outputMode:
        parsed.outputMode === 'full-app' || parsed.outputMode === 'simple'
          ? parsed.outputMode
          : undefined,
    };
  } catch {
    return null;
  }
}

export function clearWorkspaceSnapshot(): void {
  safeLocalStorageRemove(BUILDER_WORKSPACE_SNAPSHOT_KEY);
  safeLocalStorageRemove(BUILDER_CURRENT_CODE_KEY);
}
