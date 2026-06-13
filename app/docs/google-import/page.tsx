import Link from 'next/link';
import Layout from '@/app/components/Layout';

export const metadata = {
  title: 'Google Places Import · NiskBuild',
  description:
    'Import a client business from Google Maps and pre-fill your generated app with real name, address, phone, and hours.',
};

export default function GoogleImportDocsPage() {
  return (
    <Layout variant="marketing">
      <article className="max-w-3xl mx-auto py-12 px-4">
        <p className="text-[var(--accent-cyan)] text-sm font-medium mb-2">Pro feature</p>
        <h1 className="text-4xl font-bold text-white mb-4">Import Business from Google Places</h1>
        <p className="text-nisk-muted text-lg leading-relaxed mb-10">
          Search Google Maps for your client&apos;s business and let NiskBuild pre-fill the generated
          website with real contact details, hours, and ratings — like SiteDrop.
        </p>

        <section className="space-y-8 text-gray-300 leading-relaxed">
          <div className="rounded-2xl border border-nisk bg-nisk-card p-6">
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <ol className="list-decimal list-inside space-y-2 text-nisk-muted">
              <li>In the Builder, click <strong className="text-white">Import Business from Google</strong></li>
              <li>Search by business name and city (debounced as you type)</li>
              <li>Select the correct result card</li>
              <li>Click <strong className="text-white">Use this business</strong></li>
              <li>Hit <strong className="text-white">Generate</strong> — AI receives full business context</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-nisk bg-nisk-card p-6">
            <h2 className="text-xl font-semibold text-white mb-3">What gets imported</h2>
            <ul className="list-disc list-inside space-y-1 text-nisk-muted">
              <li>Business name, address, phone, website</li>
              <li>Opening hours (weekday text from Google)</li>
              <li>Star rating and review count</li>
              <li>Business category / type</li>
              <li>Review snippets for description copy</li>
              <li>Raw Google JSON stored in <code className="text-[var(--accent-cyan)]">project_context</code></li>
            </ul>
          </div>

          <div className="rounded-2xl border border-nisk bg-nisk-card p-6">
            <h2 className="text-xl font-semibold text-white mb-3">AI auto-fill</h2>
            <p className="text-nisk-muted mb-3">
              NiskBuild injects verified business data into the generation prompt so your app ships with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-nisk-muted">
              <li>Real business name in headers and footer</li>
              <li>Accurate address on contact pages</li>
              <li>Click-to-call phone number</li>
              <li>Correct opening hours</li>
              <li>Rating display from Google reviews</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Privacy &amp; cost</h2>
            <ul className="list-disc list-inside space-y-2 text-nisk-muted">
              <li>Google API key stays server-side only — never exposed to the browser</li>
              <li>~$0.017 per Places search (billed to your Google Cloud project)</li>
              <li>Available on <strong className="text-white">Pro plan and above</strong></li>
              <li>Imports logged anonymously in metadata (no PII in analytics)</li>
            </ul>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/builder" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium">
            Open Builder
          </Link>
          <Link href="/pricing" className="btn-secondary px-5 py-2.5 rounded-xl text-sm">
            View Pro plans
          </Link>
        </div>
      </article>
    </Layout>
  );
}
