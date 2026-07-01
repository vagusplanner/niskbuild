export default function ShiftAiConsentInvalidPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <p className="text-lg text-slate-700">This consent link is invalid or has already been used</p>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: 'Consent link invalid · Shift AI',
    robots: 'noindex',
  };
}
