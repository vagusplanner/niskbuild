import { redirect } from 'next/navigation';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';

export default function ShiftAiMasteryHeatmapPage() {
  redirect('/builder/shift-ai/analytics#study-streak');
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).analytics.heatmap.metaTitle,
    robots: 'noindex',
  };
}
