import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import ShiftAiBillingClient from '@/app/builder/shift-ai/billing/ShiftAiBillingClient';
import { resolveShiftPlanAccess } from '@/lib/shift-ai/plan-access';
import { getSafeSession } from '@/lib/supabaseSession.server';
import { shiftAiAppPath } from '@/lib/supereduc8-host';

export default async function ShiftAiBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; children?: string }>;
}) {
  const session = await getSafeSession();
  const params = await searchParams;
  const defaultPlan = params.plan === 'family' ? 'family' : 'student';
  const defaultChildQuantity = Math.max(
    0,
    Math.min(20, Number.parseInt(params.children || '0', 10) || 0)
  );

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(shiftAiAppPath('/billing'))}`);
  }

  const access = await resolveShiftPlanAccess(session.user.id);

  return (
    <Suspense fallback={<div className="p-10 text-sm text-neutral-500">Loading billing…</div>}>
      <ShiftAiBillingClient
        initialAccess={access}
        defaultPlan={defaultPlan}
        defaultChildQuantity={defaultChildQuantity}
      />
    </Suspense>
  );
}

export async function generateMetadata() {
  return {
    title: 'Billing · SuperEduc8',
    robots: 'noindex',
  };
}
