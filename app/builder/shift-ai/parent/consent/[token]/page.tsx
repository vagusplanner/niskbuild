import Link from 'next/link';
import {
  approveParentConsent,
  declineParentConsent,
} from '@/lib/shift-ai/consent-actions';
import {
  getConsentRequestByToken,
  isConsentRequestValid,
} from '@/lib/shift-ai/consent-auth';

interface ConsentPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}

export default async function ShiftAiParentConsentPage({
  params,
  searchParams,
}: ConsentPageProps) {
  const { token } = await params;
  const query = await searchParams;

  if (query.status === 'approved') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-lg text-slate-900">Thank you — your child&apos;s account is now active.</p>
          <p className="mt-3 text-sm text-slate-600">We emailed you login details and your parent dashboard link.</p>
        </div>
      </main>
    );
  }

  if (query.status === 'declined') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-lg text-slate-700">Consent declined. No account was created.</p>
      </main>
    );
  }

  if (query.error === 'activate') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-lg text-slate-700">We could not activate the account. Please try again or contact support.</p>
      </main>
    );
  }

  const request = await getConsentRequestByToken(token);

  if (!request) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-lg text-slate-700">This consent link is invalid or has already been used</p>
      </main>
    );
  }

  if (request.status !== 'pending') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-lg text-slate-700">This consent link is invalid or has already been used</p>
      </main>
    );
  }

  if (!isConsentRequestValid(request)) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-lg text-slate-700">This consent link is invalid or has already been used</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-6 py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Shift AI</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Parental consent</h1>

        <div className="mt-6 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            <strong>{request.childFirstName}</strong>
            {request.yearGroup ? ` (${request.yearGroup})` : ''} would like to use Shift AI — an AI study
            companion that adapts to UK, French, and US school curricula.
          </p>
          <p>
            Shift AI helps with homework, revision, and exam preparation. We collect a coarse age band
            and study progress to personalise learning — not precise location, and we do not store raw
            chat transcripts (the same privacy approach as NiskBuild analytics).
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <form action={approveParentConsent.bind(null, token)} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              I consent — activate my child&apos;s account
            </button>
          </form>
          <form action={declineParentConsent.bind(null, token)} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Decline
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/builder/shift-ai/signup" className="text-indigo-600 hover:underline">
            Shift AI sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: 'Parental consent · Shift AI',
    robots: 'noindex',
  };
}
