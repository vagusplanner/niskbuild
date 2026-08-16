import Link from 'next/link';
import {
  approveParentConsent,
  declineParentConsent,
} from '@/lib/shift-ai/consent-actions';
import {
  getConsentRequestByToken,
  isConsentRequestValid,
} from '@/lib/shift-ai/consent-auth';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { withLangQuery } from '@/lib/shift-ai/locale-query';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';

interface ConsentPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string; error?: string; lang?: string }>;
}

export default async function ShiftAiParentConsentPage({
  params,
  searchParams,
}: ConsentPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const copy = shiftAiCatalog(await getRequestStudyLanguage()).parentConsent;

  if (query.status === 'approved') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-lg text-slate-900">{copy.approved}</p>
          <p className="mt-3 text-sm text-slate-600">{copy.approvedHint}</p>
        </div>
      </main>
    );
  }

  if (query.status === 'declined') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-lg text-slate-700">{copy.declined}</p>
      </main>
    );
  }

  if (query.error === 'activate') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-lg text-slate-700">{copy.activateError}</p>
      </main>
    );
  }

  const request = await getConsentRequestByToken(token);

  if (!request) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-lg text-slate-700">{copy.invalid}</p>
      </main>
    );
  }

  if (request.status !== 'pending') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-lg text-slate-700">{copy.invalid}</p>
      </main>
    );
  }

  if (!isConsentRequestValid(request)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-lg text-slate-700">{copy.invalid}</p>
      </main>
    );
  }

  const intro = request.yearGroup
    ? copy.introWithYear.replaceAll('{name}', request.childFirstName).replaceAll('{year}', request.yearGroup)
    : copy.introWithoutYear.replaceAll('{name}', request.childFirstName);

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-6 py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">{copy.kicker}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{copy.title}</h1>

        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">
          {copy.legalReviewBanner}
        </p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">
          <p>{intro}</p>
          <p>{copy.privacyBody}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <form action={approveParentConsent.bind(null, token, query.lang)} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {copy.approve}
            </button>
          </form>
          <form action={declineParentConsent.bind(null, token, query.lang)} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {copy.decline}
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          {copy.alreadyAccount}{' '}
          <Link
            href={withLangQuery('/builder/shift-ai/signup', query.lang)}
            className="text-indigo-600 hover:underline"
          >
            {copy.signupLink}
          </Link>
        </p>
      </div>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).parentConsent.metaTitle,
    robots: 'noindex',
  };
}
