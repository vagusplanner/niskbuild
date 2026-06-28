/** Single storage strategy: two dedicated private buckets (imports vs exports). */

export const STORAGE_BUCKET_IMPORTED_APPS = 'imported-apps' as const;
export const STORAGE_BUCKET_PROJECT_EXPORTS = 'project-exports' as const;

export function importedAppSourceObjectPath(slug: string): string {
  return `${slug}/source.zip`;
}

export function importedAppManifestObjectPath(slug: string): string {
  return `${slug}/niskbuild.import.json`;
}

export function projectExportZipObjectPath(
  userId: string,
  projectId: string,
  jobId: string
): string {
  return `${userId}/${projectId}/${jobId}/native-export.zip`;
}
