import { NextRequest, NextResponse } from 'next/server';
import {
  contentTypeFor,
  VP_DEPLOY_CORS_HEADERS,
  vpDeployStoragePublicObjectUrl,
} from '@/lib/vp-deploy-bundle';

type RouteContext = {
  params: Promise<{ userId: string; token: string; assetPath?: string[] }>;
};

function withCors(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: { ...VP_DEPLOY_CORS_HEADERS, ...(init?.headers as Record<string, string> | undefined) },
  };
}

export async function OPTIONS() {
  return new NextResponse(null, withCors({ status: 204 }));
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { userId, token, assetPath } = await context.params;
  const relativePath = assetPath?.length ? assetPath.join('/') : 'index.html';

  if (!relativePath || relativePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, withCors({ status: 400 }));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ error: 'Storage not configured' }, withCors({ status: 500 }));
  }

  const storageUrl = vpDeployStoragePublicObjectUrl(userId, token, relativePath, supabaseUrl);
  const range = request.headers.get('range');

  let upstream: Response;
  try {
    upstream = await fetch(storageUrl, {
      headers: range ? { Range: range } : undefined,
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[vp-deploy] bundle proxy fetch failed:', storageUrl, err);
    return NextResponse.json({ error: 'Upstream fetch failed' }, withCors({ status: 502 }));
  }

  if (!upstream.ok) {
    return new NextResponse(null, withCors({ status: upstream.status }));
  }

  const headers = new Headers(VP_DEPLOY_CORS_HEADERS);
  headers.set(
    'Content-Type',
    upstream.headers.get('Content-Type') || contentTypeFor(relativePath)
  );
  const cacheControl = upstream.headers.get('Cache-Control');
  if (cacheControl) headers.set('Cache-Control', cacheControl);
  const contentLength = upstream.headers.get('Content-Length');
  if (contentLength) headers.set('Content-Length', contentLength);
  const contentRange = upstream.headers.get('Content-Range');
  if (contentRange) headers.set('Content-Range', contentRange);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  const getResponse = await GET(request, context);
  return new NextResponse(null, {
    status: getResponse.status,
    headers: getResponse.headers,
  });
}
