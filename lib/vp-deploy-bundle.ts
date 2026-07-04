/**
 * VP deploy bundle URLs and Storage object paths (shared by deploy pipeline + proxy route).
 */

import path from 'path';

export const VP_DEPLOY_BUCKET = 'vp-deployments';

export const VP_DEPLOY_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Content-Range',
};

export function contentTypeFor(relativePath: string): string {
  const ext = path.extname(relativePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

/** Direct Supabase Storage public object URL (backend / proxy fetch only). */
export function vpDeployStoragePublicObjectUrl(
  userId: string,
  token: string,
  relativePath: string,
  supabaseProjectUrl: string
): string {
  const base = supabaseProjectUrl.replace(/\/$/, '');
  const segments = relativePath.split('/').map((s) => encodeURIComponent(s)).join('/');
  return `${base}/storage/v1/object/public/${VP_DEPLOY_BUCKET}/${encodeURIComponent(userId)}/${encodeURIComponent(token)}/${segments}`;
}

/**
 * Same-origin bundle URL for preview iframe (avoids Supabase Storage CORS issues with
 * Vite's crossorigin module scripts). Served by /vp-deploy/... proxy route.
 */
export function vpDeployBundlePublicUrl(
  userId: string,
  token: string,
  requestOrigin: string
): string {
  const previewHost = process.env.NEXT_PUBLIC_PREVIEW_HOST || 'preview.niskbuild.com';
  const origin =
    process.env.NODE_ENV === 'development'
      ? requestOrigin.replace(/\/$/, '')
      : `https://${previewHost}`;
  return `${origin}/vp-deploy/${encodeURIComponent(userId)}/${encodeURIComponent(token)}/index.html`;
}
