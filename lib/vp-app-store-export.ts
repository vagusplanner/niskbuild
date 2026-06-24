import 'server-only';

import fs from 'fs/promises';
import path from 'path';

export const VP_EXPORT_DIR = path.join(process.cwd(), 'mobile/vagus-planner/export');
export const VP_IPA_FILENAME = 'vagus-planner.ipa';
export const VP_IOS_ZIP_FILENAME = 'vagus-planner-ios.zip';
export const VP_EXPORT_MANIFEST = path.join(VP_EXPORT_DIR, 'export-manifest.json');

export type VpExportManifest = {
  success: boolean;
  startedAt?: string;
  finishedAt?: string;
  workspace?: string;
  ipaPath?: string | null;
  ipaAvailable?: boolean;
  ipaError?: string | null;
  xcodeZipPath?: string | null;
  xcodeZipAvailable?: boolean;
  manifestPath?: string;
  error?: string;
};

export async function readVpExportManifest(): Promise<VpExportManifest | null> {
  try {
    const raw = await fs.readFile(VP_EXPORT_MANIFEST, 'utf8');
    return JSON.parse(raw) as VpExportManifest;
  } catch {
    return null;
  }
}

export function resolveVpExportFile(kind: 'ipa' | 'ios-zip'): string {
  const file =
    kind === 'ipa'
      ? path.join(VP_EXPORT_DIR, VP_IPA_FILENAME)
      : path.join(VP_EXPORT_DIR, VP_IOS_ZIP_FILENAME);

  const resolved = path.resolve(file);
  if (!resolved.startsWith(path.resolve(VP_EXPORT_DIR))) {
    throw new Error('Invalid export path');
  }

  return resolved;
}

export async function exportFileExists(kind: 'ipa' | 'ios-zip'): Promise<boolean> {
  try {
    await fs.access(resolveVpExportFile(kind));
    return true;
  } catch {
    return false;
  }
}
