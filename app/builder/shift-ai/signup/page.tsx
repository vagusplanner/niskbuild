import ShiftAiSignupForm from '@/app/builder/shift-ai/signup/ShiftAiSignupForm';
import { SA } from '@/lib/shift-ai/theme';

export default function ShiftAiSignupPage() {
  return (
    <main className={SA.authPage}>
      <div className="mx-auto max-w-lg">
        <header className="mb-10 text-center">
          <p className={SA.authKicker}>Shift Learning</p>
          <h1 className={`mt-2 text-3xl font-bold ${SA.text}`}>Start learning smarter</h1>
          <p className={`mt-3 ${SA.muted}`}>
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
