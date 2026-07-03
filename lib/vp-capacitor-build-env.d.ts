export const VP_API_BASE_URL_EXPORT_WARNING: string;

export function resolveVpApiBaseUrl(): string;

export function warnIfMissingVpApiBaseUrl(forExport?: boolean): void;

export function buildVpCapacitorBuildEnv(
  forExport?: boolean
): { CAPACITOR_BUILD: string; VITE_API_BASE_URL: string };
