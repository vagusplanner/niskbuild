import Layout from '@/app/components/Layout';
import { requirePlatformOwnerPage } from '@/lib/platform-owner-auth';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
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
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).studio.metaTitle,
    robots: 'noindex',
  };
}
