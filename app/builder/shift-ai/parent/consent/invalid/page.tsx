import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';

export default async function ShiftAiConsentInvalidPage() {
  const copy = shiftAiCatalog(await getRequestStudyLanguage()).parentConsent;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-lg text-slate-700">{copy.invalid}</p>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).parentConsent.invalidMetaTitle,
    robots: 'noindex',
  };
}
