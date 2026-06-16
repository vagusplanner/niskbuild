/** Build a same-origin proxy URL so Google API keys never reach the client bundle. */
export function buildPlacesPhotoProxyUrl(photoReference: string): string {
  return `/api/import/google-places/photo?ref=${encodeURIComponent(photoReference)}`;
}

export function resolvePlacesPhotoUrls(
  photoReferences: string[] | undefined,
  max = 6
): string[] {
  if (!photoReferences?.length) return [];
  return photoReferences
    .slice(0, max)
    .filter((ref) => typeof ref === 'string' && ref.length > 0)
    .map(buildPlacesPhotoProxyUrl);
}
