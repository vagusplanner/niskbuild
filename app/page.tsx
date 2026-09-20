import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isSuperEduc8Request } from '@/lib/supereduc8-request';
import { getSafeSession } from '@/lib/supabaseSession.server';
import NiskBuildHomeClient from './NiskBuildHomeClient';
import SuperEduc8LandingPage from './SuperEduc8LandingPage';

export async function generateMetadata(): Promise<Metadata> {
  if (await isSuperEduc8Request()) {
    return {
      title: 'SuperEduc8 — Your child\'s personal AI tutor',
      description:
        'AI tutoring for students ages 7–17: homework help, essay feedback, and exam prep — with real visibility for parents and teachers.',
      robots: { index: true, follow: true },
    };
  }

  return {
    title: 'NiskBuild - Build Apps with AI',
  };
}

/**
 * Site root:
 * - supereduc8.com → marketing landing (signed-in users → /dashboard)
 * - niskbuild.com → recovery rescue → /landing-v2
 */
export default async function HomePage() {
  if (await isSuperEduc8Request()) {
    const session = await getSafeSession();
    if (session?.user) {
      redirect('/dashboard');
    }
    return <SuperEduc8LandingPage />;
  }

  return <NiskBuildHomeClient />;
}
