import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { TenantRuntimeShell } from '@/app/components/TenantRuntimeShell';
import { getCompiledApplicationById } from '@/lib/compiled-applications';
import { resolveTenantBrand, tenantDisplayName, tenantDocumentTitle } from '@/lib/tenant-brand';

interface MobileRuntimePageProps {
  params: Promise<{ id: string }>;
}

async function hostBrand() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  return resolveTenantBrand(host.split(':')[0] || '');
}

export default async function MobileRuntimePage({ params }: MobileRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);

  if (!app || app.app_type !== 'mobile' || app.status !== 'active') {
    notFound();
  }

  const brand = await hostBrand();
  return <TenantRuntimeShell app={app} variant="mobile" brand={brand} />;
}

export async function generateMetadata({ params }: MobileRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);
  const brand = await hostBrand();
  const projectTitle =
    typeof app?.configuration_state?.title === 'string'
      ? app.configuration_state.title
      : null;
  const title = tenantDocumentTitle(brand, projectTitle, 'Mobile App');
  return {
    title,
    applicationName: tenantDisplayName(brand, 'NiskBuild'),
    icons: brand?.logoUrl ? [{ url: brand.logoUrl }] : undefined,
    robots: 'noindex',
    manifest: brand ? '/tenant-manifest' : undefined,
  };
}
