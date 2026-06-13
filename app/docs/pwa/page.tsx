import Link from 'next/link';
import Layout from '@/app/components/Layout';
import PageBackHeader from '@/app/components/PageBackHeader';

export const metadata = {
  title: 'PWA Guide · NiskBuild',
  description:
    'Learn what a Progressive Web App is, how to share it with clients, and how to test install on iPhone and Android.',
};

export default function PwaDocsPage() {
  return (
    <Layout variant="marketing">
      <PageBackHeader href="/dashboard" label="Back to Dashboard" />
      <article className="max-w-3xl mx-auto py-8 px-4">
        <p className="text-[var(--accent-cyan)] text-sm font-medium mb-2">Mobile Phase 1</p>
        <h1 className="text-4xl font-bold text-white mb-4">Progressive Web Apps (PWA)</h1>
        <p className="text-nisk-muted text-lg leading-relaxed mb-10">
          A PWA lets your NiskBuild app install on iPhone and Android like a native app — without the App Store.
          Host once, share a link, clients tap <strong className="text-white">Add to Home Screen</strong>.
        </p>

        <section className="space-y-8 text-gray-300 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">What is a PWA?</h2>
            <p>
              A Progressive Web App is a website with superpowers: it can run full-screen from the home screen,
              work offline (with a service worker), and feel like a native app. For agencies and freelancers,
              PWAs are the fastest way to deliver &quot;mobile apps&quot; to clients — no $99/year Apple developer
              account required for distribution.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">How to export from NiskBuild</h2>
            <ol className="list-decimal list-inside space-y-2 text-nisk-muted">
              <li>Save your project in the Builder.</li>
              <li>Open <Link href="/dashboard" className="text-[var(--accent-cyan)] hover:underline">Dashboard</Link> → Saved Projects.</li>
              <li>Click <strong className="text-white">Export as Mobile App</strong> (Pro plan or above).</li>
              <li>Choose <strong className="text-white">PWA Export</strong> and download the ZIP.</li>
              <li>Upload the ZIP contents to any HTTPS host (Vercel, Netlify, etc.).</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Share with clients</h2>
            <p>
              Send clients your live HTTPS URL. They install once from Safari or Chrome — no app review, no store
              listing. When you redeploy updates, users get the new version on their next visit (service worker refresh).
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Test on iPhone (Safari)</h2>
            <ol className="list-decimal list-inside space-y-2 text-nisk-muted">
              <li>Open your hosted URL in Safari (not Chrome on iOS).</li>
              <li>Tap Share → <strong className="text-white">Add to Home Screen</strong>.</li>
              <li>Launch from the new icon — full-screen, no browser chrome.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Test on Android (Chrome)</h2>
            <ol className="list-decimal list-inside space-y-2 text-nisk-muted">
              <li>Open your hosted URL in Chrome.</li>
              <li>Menu (⋮) → <strong className="text-white">Install app</strong> or Add to Home screen.</li>
              <li>Open from the app drawer or home screen.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">PWA vs native (Capacitor)</h2>
            <p className="mb-3">
              <strong className="text-white">PWA</strong> — instant delivery, any phone, browser install. Best for MVPs,
              client demos, and internal tools.
            </p>
            <p>
              <strong className="text-white">Native (Agency+)</strong> — Capacitor wraps your app for Xcode / Android Studio
              and App Store / Play Store submission. Use when you need store presence or deep OS APIs.
            </p>
          </div>

          <div className="pt-4 border-t border-nisk">
            <Link
              href="/pricing"
              className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-purple-600 text-white font-semibold text-sm no-underline hover:opacity-90"
            >
              Upgrade to Pro for PWA export
            </Link>
          </div>
        </section>
      </article>
    </Layout>
  );
}
