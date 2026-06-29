import Link from 'next/link';
import Layout from '@/app/components/Layout';

export default function NpsThanksPage() {
  return (
    <Layout>
      <div className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Thank you</h1>
        <p className="text-nisk-muted mb-6">
          Your score helps us improve NiskBuild for freelancers and agencies.
        </p>
        <Link href="/dashboard" className="text-[var(--copper-melt)] hover:underline text-sm">
          ← Back to dashboard
        </Link>
      </div>
    </Layout>
  );
}
