import { notFound } from 'next/navigation';
import { TenantRuntimeShell } from '@/app/components/TenantRuntimeShell';
import { getCompiledApplicationById } from '@/lib/compiled-applications';

interface MobileRuntimePageProps {
  params: Promise<{ id: string }>;
}

export default async function MobileRuntimePage({ params }: MobileRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);

  if (!app || app.app_type !== 'mobile' || app.status !== 'active') {
    notFound();
  }

  return <TenantRuntimeShell app={app} variant="mobile" />;
}

export async function generateMetadata({ params }: MobileRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);
  const title = app?.configuration_state?.title || 'Mobile App';
  return {
    title,
    robots: 'noindex',
  };
}
