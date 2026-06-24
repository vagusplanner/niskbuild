import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Layout from '@/app/components/Layout';
import VagusPlannerClient from '../VagusPlannerClient';

export default async function VagusPlannerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto p-8 text-center pt-24">
          <h1 className="text-2xl font-bold mb-4 text-[var(--foreground)]">Vagus Planner</h1>
          <p className="text-nisk-muted mb-6">Please log in to access Vagus Planner.</p>
          <Link
            href="/login?next=/vagus-planner/dashboard"
            className="inline-block px-6 py-3 btn-primary font-semibold"
          >
            Log In
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <VagusPlannerClient user={user} />
    </Layout>
  );
}
