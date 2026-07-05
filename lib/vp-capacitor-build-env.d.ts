export const VP_API_BASE_URL_EXPORT_WARNING: string;
export const VP_SUPABASE_EXPORT_WARNING: string;

export function resolveVpApiBaseUrl(): string;
export function resolveVpSupabaseUrl(): string;
export function resolveVpSupabaseAnonKey(): string;

export function warnIfMissingVpApiBaseUrl(forExport?: boolean): void;
export function warnIfMissingVpSupabaseEnv(forExport?: boolean): void;

export function buildVpCapacitorBuildEnv(forExport?: boolean): {
  CAPACITOR_BUILD: string;
  VITE_API_BASE_URL: string;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
};
