import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { GameRuntimeShell } from '@/app/components/GameRuntimeShell';
import { getCompiledApplicationById, runtimeHtmlFromConfig } from '@/lib/compiled-applications';
import { resolveTenantBrand, tenantDisplayName } from '@/lib/tenant-brand';

interface GameRuntimePageProps {
  params: Promise<{ id: string }>;
}

async function hostBrand() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  return resolveTenantBrand(host.split(':')[0] || '');
}

export default async function GameRuntimePage({ params }: GameRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);

  if (!app || app.app_type !== 'game' || app.status !== 'active') {
    notFound();
  }

  const brand = await hostBrand();
  const title =
    app.configuration_state?.title || tenantDisplayName(brand, 'Game');
  const html = runtimeHtmlFromConfig(app);
  const bundleUrl =
    typeof app.configuration_state?.bundle_url === 'string'
      ? app.configuration_state.bundle_url
      : null;

  return (
    <GameRuntimeShell
      title={title}
      html={html}
      bundleUrl={bundleUrl}
      brand={brand}
    />
  );
}

export async function generateMetadata({ params }: GameRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);
  const brand = await hostBrand();
  const title =
    app?.configuration_state?.title || tenantDisplayName(brand, 'Game');
  return {
    title,
    applicationName: tenantDisplayName(brand, 'NiskBuild'),
    icons: brand?.logoUrl ? [{ url: brand.logoUrl }] : undefined,
    robots: 'noindex',
    manifest: brand ? '/tenant-manifest' : undefined,
  };
}
