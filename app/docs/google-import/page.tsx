import Link from 'next/link';
import Layout from '@/app/components/Layout';
import PageBackHeader from '@/app/components/PageBackHeader';

export const metadata = {
  title: 'Google Places Import · NiskBuild',
  description:
    'Import a client business from Google Maps with AI enrichment, review intelligence, and SEO keywords — beyond basic import tools.',
};

export default function GoogleImportDocsPage() {
  return (
    <Layout variant="marketing">
      <PageBackHeader href="/builder" label="Back to Builder" />
      <article className="max-w-3xl mx-auto py-8 px-4">
        <p className="text-[var(--accent-cyan)] text-sm font-medium mb-2">Pro feature</p>
        <h1 className="text-4xl font-bold text-white mb-4">Import Business from Google Places</h1>
        <p className="text-nisk-muted text-lg leading-relaxed mb-4">
          SiteDrop imports data. <strong className="text-white">NiskBuild understands your business.</strong>
        </p>
        <p className="text-nisk-muted leading-relaxed mb-10">
          Search Google Maps, then let AI predict missing contact info, analyze review sentiment,
          and generate SEO-ready copy for your client&apos;s website.
        </p>

        <section className="space-y-8 text-gray-300 leading-relaxed">
          <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">What makes this unique</h2>
            <ul className="list-disc list-inside space-y-2 text-nisk-muted">
              <li>
                <strong className="text-white">AI Enrichment</strong> — predicts website, email,
                Instagram handle, and SEO keywords Google doesn&apos;t provide
              </li>
              <li>
                <strong className="text-white">Review Intelligence</strong> — sentiment score,
                praise, complaints, and actionable improvements from real reviews
              </li>
              <li>
                <strong className="text-white">Photo gallery</strong> — Google business photos
                proxied into hero and gallery sections
              </li>
              <li>
                <strong className="text-white">Testimonial extraction</strong> — cleaned customer
                quote ready for your generated site
              </li>
              <li>
                <strong className="text-white">Competitor Intel</strong> (Agency+) — top 3 local
                rivals, AI comparison table, and &quot;Why Choose Us&quot; copy
              </li>
              <li>
                <strong className="text-white">Social Proof Wall</strong> (Agency+) — Instagram-style
                feed grid, social counters, &quot;As seen on&quot; badges, and photo gallery
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-nisk bg-nisk-card p-6">
            <h2 className="text-xl font-semibold text-white mb-3">How it works</h2>
            <ol className="list-decimal list-inside space-y-2 text-nisk-muted">
              <li>In the Builder, click <strong className="text-white">Import Business from Google</strong></li>
              <li>Keep <strong className="text-white">AI Enrichment ON</strong> for predictions and review analysis</li>
              <li>Agency+ users: enable <strong className="text-white">Competitor Intel</strong> or <strong className="text-white">Social Proof Wall</strong></li>
              <li>Search by business name and city (debounced as you type)</li>
              <li>Select the correct result and review enriched preview data</li>
              <li>Click <strong className="text-white">Use this business</strong>, then <strong className="text-white">Generate</strong></li>
            </ol>
          </div>

          <div className="rounded-2xl border border-nisk bg-nisk-card p-6">
            <h2 className="text-xl font-semibold text-white mb-3">What gets imported</h2>
            <ul className="list-disc list-inside space-y-1 text-nisk-muted">
              <li>Business name, address, phone, website</li>
              <li>Opening hours, star rating, review count</li>
              <li>Business category and up to 6 Google photos</li>
              <li>Review snippets for description copy</li>
              <li>Raw Google JSON stored in <code className="text-[var(--accent-cyan)]">project_context</code></li>
            </ul>
          </div>

          <div className="rounded-2xl border border-nisk bg-nisk-card p-6">
            <h2 className="text-xl font-semibold text-white mb-3">AI auto-fill (when enrichment is on)</h2>
            <p className="text-nisk-muted mb-3">
              NiskBuild injects verified + AI-enriched data into the generation prompt so your app ships with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-nisk-muted">
              <li>Predicted website and contact email when Google has none</li>
              <li>SEO-optimized hero description and 5 target keywords</li>
              <li>Testimonial section from review intelligence</li>
              <li>Copy that addresses real customer praise and concerns</li>
              <li>Business photos in hero or gallery sections</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Privacy &amp; cost</h2>
            <ul className="list-disc list-inside space-y-2 text-nisk-muted">
              <li>Google API key stays server-side only — never exposed to the browser</li>
              <li>Photos served via a secure proxy (no API key in URLs)</li>
              <li>~$0.017 per Places search (billed to your Google Cloud project)</li>
              <li>AI enrichment uses Groq (requires <code className="text-[var(--accent-cyan)]">GROQ_API_KEY</code>)</li>
              <li>Available on <strong className="text-white">Pro plan and above</strong></li>
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
