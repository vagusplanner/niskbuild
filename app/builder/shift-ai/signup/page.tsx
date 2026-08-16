import ShiftAiSignupForm from '@/app/builder/shift-ai/signup/ShiftAiSignupForm';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { SA } from '@/lib/shift-ai/theme';

export default async function ShiftAiSignupPage() {
  const catalog = shiftAiCatalog(await getRequestStudyLanguage()).auth;

  return (
    <main className={SA.authPage}>
      <div className="mx-auto max-w-lg">
        <header className="mb-10 text-center">
          <p className={SA.authKicker}>{catalog.brand}</p>
          <h1 className={`mt-2 text-3xl font-bold ${SA.text}`}>{catalog.title}</h1>
          <p className={`mt-3 ${SA.muted}`}>{catalog.subtitle}</p>
        </header>
        <ShiftAiSignupForm />
      </div>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).auth.metaTitle,
    robots: 'noindex',
  };
}
