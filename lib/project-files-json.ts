import { buildProjectFiles, filesToMap, type ProjectFile } from '@/lib/project-files';

/** Persisted shape: path → file contents (same as ZIP / niskbuild.config files). */
export type ProjectFilesJson = Record<string, string>;

/** Stored in projects.files_json / project_versions.files_json */
export type ProjectFilesPayload = {
  files: ProjectFilesJson;
  activeFile?: string;
};

export function isProjectFilesJson(value: unknown): value is ProjectFilesJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(
    ([path, content]) => typeof path === 'string' && typeof content === 'string'
  );
}

/**
 * Accepts either:
 * - `{ files: { path: content }, activeFile?: string }` (preferred)
 * - flat `{ path: content }` map (also valid)
 */
export function parseProjectFilesPayload(value: unknown): ProjectFilesPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const obj = value as Record<string, unknown>;
  if (obj.files != null) {
    if (!isProjectFilesJson(obj.files) || Object.keys(obj.files).length === 0) return null;
    return {
      files: obj.files,
      activeFile: typeof obj.activeFile === 'string' ? obj.activeFile : undefined,
    };
  }

  if (isProjectFilesJson(obj) && Object.keys(obj).length > 0) {
    return { files: obj };
  }

  return null;
}

export function buildProjectFilesPayload(
  files: ProjectFile[],
  activeFile?: string
): ProjectFilesPayload {
  return {
    files: filesToMap(files),
    activeFile: activeFile || 'index.html',
  };
}

/**
 * Resolve files for load/restore.
 * Prefer files_json; fall back to generated_code as index.html (legacy).
 */
export function resolveProjectFiles(
  generatedCode: string,
  filesJson: unknown
): { files: ProjectFile[]; activeFile: string; fileMap: ProjectFilesJson } {
  const parsed = parseProjectFilesPayload(filesJson);
  if (parsed) {
    const map = { ...parsed.files };
    if (generatedCode?.trim() && !map['index.html']?.trim()) {
      map['index.html'] = generatedCode;
    }
    const files = buildProjectFiles(generatedCode, map);
    const hint = parsed.activeFile?.trim();
    const activeFile =
      hint && files.some((f) => f.path === hint)
        ? hint
        : files.some((f) => f.path === 'index.html')
          ? 'index.html'
          : files[0]?.path || 'index.html';
    return { files, activeFile, fileMap: map };
  }

  const files = buildProjectFiles(generatedCode || '');
  return {
    files,
    activeFile: 'index.html',
    fileMap: filesToMap(files),
  };
}
