/**
 * BYO Full App backend credentials (Supabase URL + anon key).
 * Local draft storage + optional project_integrations persistence.
 */

import {
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
} from '@/lib/safe-storage';

export const FULL_APP_BACKEND_INTEGRATION = 'full_app_supabase' as const;

export type FullAppBackendMode = 'byo' | 'managed';

export type FullAppBackendConfig = {
  mode: FullAppBackendMode;
  /** Present when mode === 'byo' and connected */
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  updatedAt?: string;
};

export type FullAppBackendPublic = {
  mode: FullAppBackendMode | null;
  connected: boolean;
  supabaseUrl: string | null;
  /** Masked anon key for display */
  supabaseAnonKeyMasked: string | null;
  managedAvailable: false;
  managedLabel: 'Coming soon';
};

function localKey(projectId: string | null): string {
  return `niskbuild_full_app_backend:${projectId?.trim() || 'draft'}`;
}

export function maskAnonKey(key: string): string {
  const t = key.trim();
  if (t.length <= 12) return '••••';
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

export function isValidSupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' && u.hostname.includes('supabase');
  } catch {
    return false;
  }
}

export function isValidAnonKey(key: string): boolean {
  const t = key.trim();
  // Legacy JWT anon keys or newer sb_publishable_…
  return t.length >= 20 && (t.startsWith('eyJ') || t.startsWith('sb_'));
}

export function saveFullAppBackendLocal(
  projectId: string | null,
  config: FullAppBackendConfig
): void {
  safeLocalStorageSet(
    localKey(projectId),
    JSON.stringify({ ...config, updatedAt: new Date().toISOString() })
  );
}

export function loadFullAppBackendLocal(
  projectId: string | null
): FullAppBackendConfig | null {
  const raw = safeLocalStorageGet(localKey(projectId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FullAppBackendConfig;
    if (parsed?.mode !== 'byo' && parsed?.mode !== 'managed') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearFullAppBackendLocal(projectId: string | null): void {
  safeLocalStorageRemove(localKey(projectId));
}

/** Migrate draft → project id when a project is first saved. */
export function migrateFullAppBackendLocal(
  fromProjectId: string | null,
  toProjectId: string
): void {
  const cfg = loadFullAppBackendLocal(fromProjectId);
  if (!cfg) return;
  saveFullAppBackendLocal(toProjectId, cfg);
  if ((fromProjectId?.trim() || 'draft') !== toProjectId) {
    clearFullAppBackendLocal(fromProjectId);
  }
}

export function toPublicBackendStatus(
  config: FullAppBackendConfig | null
): FullAppBackendPublic {
  const byo =
    config?.mode === 'byo' &&
    Boolean(config.supabaseUrl?.trim() && config.supabaseAnonKey?.trim());
  return {
    mode: config?.mode ?? null,
    connected: byo,
    supabaseUrl: byo ? config!.supabaseUrl!.trim() : null,
    supabaseAnonKeyMasked: byo
      ? maskAnonKey(config!.supabaseAnonKey!)
      : null,
    managedAvailable: false,
    managedLabel: 'Coming soon',
  };
}

export function previewEnvFromConfig(
  config: FullAppBackendConfig | null
): { supabaseUrl: string; supabaseAnonKey: string } | null {
  if (
    config?.mode !== 'byo' ||
    !config.supabaseUrl?.trim() ||
    !config.supabaseAnonKey?.trim()
  ) {
    return null;
  }
  return {
    supabaseUrl: config.supabaseUrl.trim(),
    supabaseAnonKey: config.supabaseAnonKey.trim(),
  };
}
