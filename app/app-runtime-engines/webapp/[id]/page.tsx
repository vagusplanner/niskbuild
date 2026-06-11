import { notFound } from 'next/navigation';
import { TenantRuntimeShell } from '@/app/components/TenantRuntimeShell';
import { getCompiledApplicationById } from '@/lib/compiled-applications';

interface WebappRuntimePageProps {
  params: Promise<{ id: string }>;
}

export default async function WebappRuntimePage({ params }: WebappRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);

  if (!app || app.app_type !== 'webapp' || app.status !== 'active') {
    notFound();
  }

  return <TenantRuntimeShell app={app} variant="webapp" />;
}

export async function generateMetadata({ params }: WebappRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);
  const title = app?.configuration_state?.title || 'Web App';
  return {
    title,
    robots: 'noindex',
  };
}
