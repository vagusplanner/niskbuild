import { notFound } from 'next/navigation';
import { GameRuntimeShell } from '@/app/components/GameRuntimeShell';
import { getCompiledApplicationById, runtimeHtmlFromConfig } from '@/lib/compiled-applications';

interface GameRuntimePageProps {
  params: Promise<{ id: string }>;
}

export default async function GameRuntimePage({ params }: GameRuntimePageProps) {
  const { id } = await params;
  const app = await getCompiledApplicationById(id);

  if (!app || app.app_type !== 'game' || app.status !== 'active') {
    notFound();
  }

  const title = app.configuration_state?.title || 'Game';
  const html = runtimeHtmlFromConfig(app);
  const bundleUrl =
    typeof app.configuration_state?.bundle_url === 'string'
      ? app.configuration_state.bundle_url
      : null;

  return <GameRuntimeShell title={title} html={html} bundleUrl={bundleUrl} />;
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
