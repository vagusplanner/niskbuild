import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy · Vagus Planner',
  description:
    'How Vagus Planner collects, uses, stores, and protects your personal data.',
  robots: { index: true, follow: true },
};

const LAST_UPDATED = 'September 19, 2026';
const SUPPORT_EMAIL = 'support@vagusplanner.com';

/**
 * Public App Store / web Privacy Policy (canonical URL).
 * Keep in sync with apps/vagus-planner/src/pages/PrivacyPolicy.jsx
 */
export default function VagusPlannerPublicPrivacyPage() {
  return (
    <main className="min-h-screen bg-[#060f1e] text-white/80 py-12 px-4">
      <article className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-[#E8B84B]">Vagus Planner</p>
          <h1 className="text-3xl font-bold text-white">Vagus Planner Privacy Policy</h1>
          <p className="text-sm text-white/50">Last updated: {LAST_UPDATED}</p>
          <p className="text-sm leading-relaxed text-white/70">
            This Privacy Policy explains how Vagus Planner (&quot;VP,&quot; &quot;we,&quot; &quot;us&quot;) collects, uses,
            stores, and protects your personal data when you use our mobile application and website
            (vagusplanner.com). Vagus Planner is a product of NiskBuild.
          </p>
          <p className="text-sm leading-relaxed text-white/55">
            This policy is written to be accurate and complete as of today. It has been reviewed for
            factual accuracy against our actual systems, but has not yet received final sign-off from
            outside legal counsel. We recommend treating it as authoritative in the meantime, and we
            will update this notice once that review is complete.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1. Who We Are</h2>
          <p className="text-sm text-white/65">
            Vagus Planner is operated by NiskBuild. For any privacy questions or requests, contact us
            at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#38bdf8] hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            or through our support page (
            <a
              href="https://vagusplanner.com/support"
              className="text-[#38bdf8] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              vagusplanner.com/support
            </a>
            ).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">2. What Data We Collect</h2>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-white/90">Account &amp; Identity</h3>
            <ul className="list-disc ml-5 text-sm text-white/65 space-y-1.5">
              <li>Email address and authentication credentials</li>
              <li>Full name (if provided)</li>
              <li>
                Date of birth (collected once, during initial consent, to confirm you meet our
                minimum age requirement)
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-white/90">Preferences &amp; Settings</h3>
            <ul className="list-disc ml-5 text-sm text-white/65 space-y-1.5">
              <li>
                Your city/location or coordinates (used to calculate accurate prayer times, if
                Islamic Edition is enabled)
              </li>
              <li>Your chosen app edition (Standard or Islamic), language, and theme</li>
              <li>Notification preferences</li>
              <li>
                Your consent choices (terms, privacy, cookies, age confirmation, and separate
                consent for religious and health AI processing — see Section 6)
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-white/90">Content You Create</h3>
            <p className="text-sm text-white/65">
              Depending on which features you use, we store: calendar events, categories, meetings,
              reminders, and any shared/group calendar activity; tasks, goals, habits, and habit
              completions; journal/reflection entries; trip and travel plans; expense and budget
              entries you enter yourself; prayer logs, saved Islamic events, and saved religious
              reference material (if Islamic Edition is enabled); period and cycle-tracking entries
              (if you use this feature); chat messages, group discussions, shared files, and live
              location (only if you actively use these collaboration features).
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-white/90">Billing</h3>
            <ul className="list-disc ml-5 text-sm text-white/65 space-y-1.5">
              <li>Subscription status, invoice records, and usage counters</li>
              <li>
                We do not store your full card number — payment card details are handled entirely by
                Stripe, our payment processor
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-white/90">If You Connect Google Calendar</h3>
            <ul className="list-disc ml-5 text-sm text-white/65 space-y-1.5">
              <li>
                We request read-only access to your primary Google Calendar (scope:{' '}
                <code className="text-white/80">calendar.readonly</code>), plus basic profile
                information (your Google account email) to confirm the connection
              </li>
              <li>
                We do not request write access, and we do not modify or delete anything in your Google
                Calendar
              </li>
              <li>
                We pull events from roughly 30 days in the past to 90 days in the future
              </li>
              <li>
                Your Google OAuth tokens are stored securely on our servers and are never exposed to
                the app itself; you can disconnect this at any time from Account → Preferences →
                Calendar Integrations
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-white/90">Device &amp; Technical Data</h3>
            <ul className="list-disc ml-5 text-sm text-white/65 space-y-1.5">
              <li>
                A push notification device token (used solely to deliver reminders you&apos;ve asked
                for)
              </li>
              <li>
                Standard technical data your device sends automatically (IP address, general
                device/browser information) as part of normal web/app requests
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-white/90">Uploaded Files</h3>
            <ul className="list-disc ml-5 text-sm text-white/65 space-y-1.5">
              <li>
                Any files or images you choose to upload are stored under a private, user-specific
                storage path
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-white/90">Support Requests</h3>
            <ul className="list-disc ml-5 text-sm text-white/65 space-y-1.5">
              <li>
                If you contact us through our support form, we store your message, contact details,
                and category, so we can respond to you
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3. Third-Party Services We Use</h2>
          <p className="text-sm text-white/65">
            We rely on the following processors to operate Vagus Planner. Each only receives the data
            necessary for its specific role: Supabase (our core database, authentication, and file
            storage); Stripe (payment processing and subscription billing); Resend (sending account
            and service emails — welcome, billing, password reset, reminders); Groq (AI processing —
            this is the only AI provider used for anything involving religious or health-related
            content, see Section 6); Together AI / Anthropic (backup AI providers used only for
            general, non-religious, non-health AI features, if Groq is unavailable); Aladhan API
            (calculating prayer times based on your location, Islamic Edition); Apple Push
            Notification service, APNs (delivering push notifications to your iPhone); Google
            (Calendar sync, if you choose to connect it); OpenStreetMap / Nominatim / Overpass
            (location lookups and finding nearby mosques or halal-friendly places); Vercel (hosting
            our servers and website).
          </p>
          <p className="text-sm text-white/65">
            We do not sell your personal data to anyone, and we do not use your data for third-party
            advertising.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4. How Long We Keep Your Data</h2>
          <ul className="list-disc ml-5 text-sm text-white/65 space-y-2">
            <li>
              If you cancel your subscription: your data is fully preserved. Only paid-tier features
              become unavailable once your billing period ends. Nothing is deleted.
            </li>
            <li>
              If you delete your account: we permanently and immediately delete your account data
              across our systems, including all the content categories listed in Section 2, your
              uploaded files, and (if connected) your Google Calendar tokens. This happens right away
              — we do not hold a waiting period before deletion. (Note: our infrastructure
              providers&apos; routine backups may retain copies for a short additional time as a normal
              part of backup rotation, separate from our own systems.)
            </li>
            <li>
              Currently, we do not automatically delete data for accounts that have simply gone
              inactive without an explicit deletion request. We are evaluating adding an automated
              retention policy for long-inactive accounts in a future update.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5. Your Rights</h2>
          <p className="text-sm text-white/65">
            You can, at any time: export your data (request a full export of everything we hold about
            you, in a portable format, from your Account settings); delete your account (permanently
            and immediately remove your account and all associated data); withdraw AI consent (turn
            off religious or health AI processing consent at any time from Account → Privacy &amp;
            Consent — this does not delete any data you&apos;ve already logged, it only stops AI
            features from processing that category of content going forward); contact us with any
            other privacy question or request at {SUPPORT_EMAIL}.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            6. Special Category Data (Religious and Health Information)
          </h2>
          <p className="text-sm text-white/65">
            Some of what Vagus Planner helps you track — like prayer practice, Quran engagement, or
            health and wellness notes — falls under what data protection law calls &quot;special
            category&quot; personal data, which receives extra protection.
          </p>
          <p className="text-sm text-white/65">Here&apos;s exactly how this works in Vagus Planner:</p>
          <ul className="list-disc ml-5 text-sm text-white/65 space-y-2">
            <li>
              Logging and storing this data is never blocked. You can use Islamic Edition features,
              log prayers, track your cycle, or write wellness journal entries without giving any
              special consent — these are core features you&apos;re choosing to use.
            </li>
            <li>
              Separate, explicit consent is required only when you want AI to process this kind of
              content — for example, asking our AI assistant a question that touches on prayer,
              health, or related topics. Until you give this consent, those specific AI features
              simply won&apos;t run; your underlying data isn&apos;t affected either way.
            </li>
            <li>
              When you do consent, and AI touches religious or health content, it is processed
              exclusively through Groq — we never route this specific content to our backup AI
              providers (Together AI or Anthropic), even if Groq is temporarily unavailable. General,
              non-sensitive AI requests may use any of our AI providers.
            </li>
            <li>
              Religious AI features specifically also require an active Islamic Edition subscription.
            </li>
            <li>You can withdraw this consent at any time, as described in Section 5.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">7. Children&apos;s Privacy</h2>
          <p className="text-sm text-white/65">
            Vagus Planner is not intended for children under 13. We ask you to confirm your date of
            birth and that you meet this minimum age requirement before you can use the app. We do
            not knowingly collect data from anyone under 13.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">8. International Data Transfers</h2>
          <p className="text-sm text-white/65">
            Because we use globally-operating service providers (listed in Section 3), your data may
            be processed in countries outside your own, including the United States. Each of these
            providers maintains their own data protection safeguards appropriate to international
            transfers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">9. Security</h2>
          <p className="text-sm text-white/65">
            We use industry-standard measures to protect your data, including encrypted connections
            (HTTPS/TLS) for all data in transit, access controls limiting who can view your data, and
            secure credential storage. No system is perfectly secure, but we take reasonable, ongoing
            steps to protect your information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">10. Changes to This Policy</h2>
          <p className="text-sm text-white/65">
            We&apos;ll update the &quot;Last updated&quot; date at the top of this page whenever we make
            changes, and we&apos;ll make a reasonable effort to notify you of any material changes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">11. Contact Us</h2>
          <p className="text-sm text-white/65">
            Questions, requests, or concerns about this policy or your data:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#38bdf8] hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            or{' '}
            <a
              href="https://vagusplanner.com/support"
              className="text-[#38bdf8] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              vagusplanner.com/support
            </a>
          </p>
        </section>

        <footer className="pt-6 border-t border-white/10 text-xs text-white/40 flex flex-wrap gap-4">
          <Link href="/vagus-planner/terms" className="hover:text-white/70 underline">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-white/70 underline">
            NiskBuild home
          </Link>
        </footer>
      </article>
    </main>
  );
}
