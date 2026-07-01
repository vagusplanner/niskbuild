import ShiftAiSignupForm from '@/app/builder/shift-ai/signup/ShiftAiSignupForm';

export default function ShiftAiSignupPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-6 py-16">
      <div className="mx-auto max-w-lg">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Shift AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Start learning smarter</h1>
          <p className="mt-3 text-slate-600">
            AI study support for ages 7–17. Choose how you want to get started.
          </p>
        </header>
        <ShiftAiSignupForm />
      </div>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: 'Sign up · Shift AI',
    robots: 'noindex',
  };
}
