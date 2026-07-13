import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy · Vagus Planner',
  description:
    'Interim accurate Privacy Policy for Vagus Planner — special-category data, processors, and your rights.',
  robots: { index: true, follow: true },
};

const LAST_UPDATED = 'July 13, 2026';
const SUPPORT_EMAIL = 'support@vagusplanner.com';

/**
 * Public App Store / web Privacy Policy.
 * Content is the interim accurate draft — [LEGAL REVIEW NEEDED] markers must stay visible.
 */
export default function VagusPlannerPublicPrivacyPage() {
  return (
    <main className="min-h-screen bg-[#060f1e] text-white/80 py-12 px-4">
      <article className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-[#E8B84B]">Vagus Planner</p>
          <h1 className="text-3xl font-bold text-white">Privacy Policy (Interim, Accurate Version)</h1>
          <p className="text-sm text-white/50">Last updated: {LAST_UPDATED}</p>
          <p className="text-sm leading-relaxed text-amber-200/90 border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2">
            <strong className="text-amber-100">[LEGAL REVIEW NEEDED]</strong> — this is an interim,
            technically-accurate draft correcting an outdated summary. Final legal language, entity
            details, and jurisdiction-specific terms should be confirmed by counsel before this is
            treated as final.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">What we collect</h2>
          <p className="text-sm text-white/70">
            To provide Vagus Planner&apos;s services, we collect and store:
          </p>
          <ul className="list-disc ml-5 text-sm text-white/65 space-y-2">
            <li>
              <strong className="text-white/85">Account information:</strong> your name and email
              address
            </li>
            <li>
              <strong className="text-white/85">Calendar and planning data:</strong> events, tasks,
              goals, and related notes you create
            </li>
            <li>
              <strong className="text-white/85">
                Prayer and Islamic practice data (if you use the Islamic edition):
              </strong>{' '}
              prayer times, prayer logs, Quran/hadith activity, halal preferences, and related
              settings.{' '}
              <strong className="text-white/90">
                This is religious/belief data, which is treated as a special category of sensitive
                personal data under GDPR (Article 9). We only process this data with your
                explicit, separate consent
              </strong>
              , which you provide during setup and can withdraw at any time in Settings.
            </li>
            <li>
              <strong className="text-white/85">
                Health and wellness data (if you use these features):
              </strong>{' '}
              sleep, mood, and related wellness tracking you choose to enter.{' '}
              <strong className="text-white/90">
                This is also special category health data under GDPR, processed only with your
                explicit, separate consent
              </strong>
              , on the same basis as above.
            </li>
            <li>
              <strong className="text-white/85">Financial data:</strong> expense/budget entries you
              create within the app, and payment information processed by Stripe (we do not store
              your card details ourselves)
            </li>
            <li>
              <strong className="text-white/85">Location data:</strong> used to calculate accurate
              prayer times and location-based features, only when you grant permission
            </li>
            <li>
              <strong className="text-white/85">Device and technical data:</strong> IP address,
              device type, and app usage data for security and service reliability
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Where your data goes (third-party processors)
          </h2>
          <p className="text-sm text-white/70">
            We work with the following third-party services to provide Vagus Planner:
          </p>
          <ul className="list-disc ml-5 text-sm text-white/65 space-y-2">
            <li>
              <strong className="text-white/85">Supabase</strong> — our database and backend
              infrastructure provider, where your account and app data is stored
            </li>
            <li>
              <strong className="text-white/85">Groq</strong> — our AI provider, used to generate
              AI-assisted insights (e.g. prayer coaching, planning suggestions).{' '}
              <strong className="text-white/90">
                If you&apos;ve consented to AI processing of religious or health data, relevant
                content from your prayer logs, calendar, or wellness entries may be sent to Groq to
                generate these insights.
              </strong>{' '}
              If you haven&apos;t consented, these AI features are simply unavailable to you, and
              this data is not sent.
            </li>
            <li>
              <strong className="text-white/85">Stripe</strong> — for payment processing
              (subscriptions)
            </li>
            <li>
              <strong className="text-white/85">Resend</strong> — for sending you account-related
              emails
            </li>
            <li>
              <strong className="text-white/85">Aladhan API</strong> — for prayer time calculations
            </li>
            <li>
              <strong className="text-white/85">Apple Push Notification service (APNs)</strong> —
              for sending you notifications (e.g. prayer reminders), if enabled
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Your rights</h2>
          <p className="text-sm text-white/70">
            Under GDPR and similar data protection laws, you have the right to:
          </p>
          <ul className="list-disc ml-5 text-sm text-white/65 space-y-2">
            <li>
              <strong className="text-white/85">Access</strong> the personal data we hold about you
            </li>
            <li>
              <strong className="text-white/85">Export</strong> your data in a portable format
              (available in Settings → Data Protection)
            </li>
            <li>
              <strong className="text-white/85">Erase</strong> your account and associated data —
              deletion is immediate and permanent, removing your data from our systems (some data
              may persist briefly in backups before automatic rotation)
            </li>
            <li>
              <strong className="text-white/85">Withdraw consent</strong> at any time for
              religious/health data processing (Settings → Privacy &amp; Consent), which stops
              future AI processing of that category of data going forward
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Children&apos;s privacy</h2>
          <p className="text-sm text-white/65">
            Vagus Planner is not intended for children under 13. We verify age at sign-up and do not
            knowingly collect data from children under this age.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Data retention</h2>
          <p className="text-sm text-white/65">
            We retain your data for as long as your account is active. If you delete your account,
            your data is removed immediately, as described above.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p className="text-sm text-white/65">
            For privacy questions or to exercise your rights, contact us at{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-[#38bdf8] hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .{' '}
            <span className="text-white/45">
              [LEGAL REVIEW NEEDED] Confirm support contact address.
            </span>
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
