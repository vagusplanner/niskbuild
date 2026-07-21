import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import ShiftAiStudioClient from './ShiftAiStudioClient';

/** Shift AI studio — platform owner navigation hub (Phase 1) */
export default async function ShiftAiStudioPage() {
  await requirePlatformOwnerPage('/builder/shift-ai/studio');

  return (
    <Layout>
      <ShiftAiStudioClient />
    </Layout>
  );
}

export async function generateMetadata() {
  return { title: 'Shift AI Studio · NiskBuild', robots: 'noindex' };
}
