import { notFound } from 'next/navigation';
import { TenantRuntimeShell } from '@/app/components/TenantRuntimeShell';
import { getCompiledApplicationById } from '@/lib/compiled-applications';

interface GameRuntimePageProps {
  params: Promise<{ id: string }>;
}

export default async function GameRuntimePage({ params }: GameRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);

  if (!app || app.app_type !== 'game' || app.status !== 'active') {
    notFound();
  }

  return <TenantRuntimeShell app={app} variant="game" />;
}

export async function generateMetadata({ params }: GameRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);
  const title = app?.configuration_state?.title || 'Game';
  return {
    title,
    robots: 'noindex',
  };
}
