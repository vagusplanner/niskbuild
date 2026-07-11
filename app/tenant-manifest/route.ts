import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantBrand, tenantDisplayName } from '@/lib/tenant-brand';
import { isBasePlatform, normalizeHost } from '@/lib/tenant-routing';

/** Dynamic PWA manifest for custom-domain tenants. */
export async function GET(request: NextRequest) {
  const host = normalizeHost(
    request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      ''
  );

  if (isBasePlatform(host)) {
    return NextResponse.redirect(new URL('/site.webmanifest', request.url));
  }

  const brand = await resolveTenantBrand(host);
  const name = tenantDisplayName(brand, 'App');
  const icons = brand?.logoUrl
    ? [
        {
          src: brand.logoUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: brand.logoUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ]
    : [
        {
          src: '/logo/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/logo/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ];

  const manifest = {
    name,
    short_name: name.slice(0, 12),
    description: `${name} — powered experience`,
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0F19',
    theme_color: '#0B0F19',
    icons,
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
