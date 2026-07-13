import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

const LOGO =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png';
const LAST_UPDATED = 'July 13, 2026';
const SUPPORT_EMAIL = 'support@vagusplanner.com';
const PUBLIC_PRIVACY_URL = 'https://niskbuild.com/vagus-planner/privacy';

/**
 * In-app Privacy Policy — must stay consistent with /vagus-planner/privacy.
 * Interim accurate draft; [LEGAL REVIEW NEEDED] markers stay visible.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#060f1e' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-[#E8B84B] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <img src={LOGO} alt="Vagus Planner" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-sm">Vagus Planner</span>
          </Link>
          <span className="text-white/40 text-xs">Last updated: {LAST_UPDATED}</span>
        </div>

        <p className="text-white/45 text-xs mb-4">
          Canonical public URL (App Store / browsers):{' '}
          <a
            href={PUBLIC_PRIVACY_URL}
            className="text-[#38bdf8] hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {PUBLIC_PRIVACY_URL}
          </a>
        </p>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a4a6e] to-[#1a7ab8] px-8 py-7 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#E8B84B]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">
                Privacy Policy (Interim, Accurate Version)
              </h1>
              <p className="text-white/60 text-sm">
                How Vagus Planner collects, uses and protects your data
              </p>
            </div>
          </div>

          <div className="p-8 space-y-8 text-white/80">
            <p className="text-sm leading-relaxed text-amber-200/90 border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2">
              <strong className="text-amber-100">[LEGAL REVIEW NEEDED]</strong> — this is an
              interim, technically-accurate draft correcting an outdated summary. Final legal
              language, entity details, and jurisdiction-specific terms should be confirmed by
              counsel before this is treated as final.
            </p>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">What we collect</h2>
              <p className="text-white/65 text-sm mb-3">
                To provide Vagus Planner&apos;s services, we collect and store:
              </p>
              <ul className="list-disc ml-5 text-white/65 space-y-2 text-sm">
                <li>
                  <strong className="text-white/85">Account information:</strong> your name and
                  email address
                </li>
                <li>
                  <strong className="text-white/85">Calendar and planning data:</strong> events,
                  tasks, goals, and related notes you create
                </li>
                <li>
                  <strong className="text-white/85">
                    Prayer and Islamic practice data (if you use the Islamic edition):
                  </strong>{' '}
                  prayer times, prayer logs, Quran/hadith activity, halal preferences, and related
                  settings.{' '}
                  <strong className="text-white/90">
                    This is religious/belief data, which is treated as a special category of
                    sensitive personal data under GDPR (Article 9). We only process this data with
                    your explicit, separate consent
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
                  <strong className="text-white/85">Financial data:</strong> expense/budget entries
                  you create within the app, and payment information processed by Stripe (we do not
                  store your card details ourselves)
                </li>
                <li>
                  <strong className="text-white/85">Location data:</strong> used to calculate
                  accurate prayer times and location-based features, only when you grant permission
                </li>
                <li>
                  <strong className="text-white/85">Device and technical data:</strong> IP address,
                  device type, and app usage data for security and service reliability
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">
                Where your data goes (third-party processors)
              </h2>
              <p className="text-white/65 text-sm mb-3">
                We work with the following third-party services to provide Vagus Planner:
              </p>
              <ul className="list-disc ml-5 text-white/65 space-y-2 text-sm">
                <li>
                  <strong className="text-white/85">Supabase</strong> — our database and backend
                  infrastructure provider, where your account and app data is stored
                </li>
                <li>
                  <strong className="text-white/85">Groq</strong> — our AI provider, used to
                  generate AI-assisted insights (e.g. prayer coaching, planning suggestions).{' '}
                  <strong className="text-white/90">
                    If you&apos;ve consented to AI processing of religious or health data, relevant
                    content from your prayer logs, calendar, or wellness entries may be sent to Groq
                    to generate these insights.
                  </strong>{' '}
                  If you haven&apos;t consented, these AI features are simply unavailable to you,
                  and this data is not sent.
                </li>
                <li>
                  <strong className="text-white/85">Stripe</strong> — for payment processing
                  (subscriptions)
                </li>
                <li>
                  <strong className="text-white/85">Resend</strong> — for sending you
                  account-related emails
                </li>
                <li>
                  <strong className="text-white/85">Aladhan API</strong> — for prayer time
                  calculations
                </li>
                <li>
                  <strong className="text-white/85">
                    Apple Push Notification service (APNs)
                  </strong>{' '}
                  — for sending you notifications (e.g. prayer reminders), if enabled
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">Your rights</h2>
              <p className="text-white/65 text-sm mb-3">
                Under GDPR and similar data protection laws, you have the right to:
              </p>
              <ul className="list-disc ml-5 text-white/65 space-y-2 text-sm">
                <li>
                  <strong className="text-white/85">Access</strong> the personal data we hold about
                  you
                </li>
                <li>
                  <strong className="text-white/85">Export</strong> your data in a portable format
                  (available in Settings → Data Protection)
                </li>
                <li>
                  <strong className="text-white/85">Erase</strong> your account and associated data
                  — deletion is immediate and permanent, removing your data from our systems (some
                  data may persist briefly in backups before automatic rotation)
                </li>
                <li>
                  <strong className="text-white/85">Withdraw consent</strong> at any time for
                  religious/health data processing (Settings → Privacy &amp; Consent), which stops
                  future AI processing of that category of data going forward
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">Children&apos;s privacy</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                Vagus Planner is not intended for children under 13. We verify age at sign-up and do
                not knowingly collect data from children under this age.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">Data retention</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We retain your data for as long as your account is active. If you delete your
                account, your data is removed immediately, as described above.
              </p>
            </section>

            <section className="pt-6 border-t border-white/10">
              <h2 className="text-lg font-bold text-white mb-3">Contact</h2>
              <p className="text-white/65 text-sm mb-2">
                For privacy questions or to exercise your rights, contact us at{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#38bdf8] hover:underline">
                  {SUPPORT_EMAIL}
                </a>
                .{' '}
                <span className="text-white/45">
                  [LEGAL REVIEW NEEDED] Confirm support contact address.
                </span>
              </p>
              <p className="text-white/50 text-sm">
                You can also use our{' '}
                <Link to="/Contact" className="text-[#38bdf8] hover:underline">
                  Contact page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>

        <div className="text-center mt-8 text-white/30 text-xs">
          © 2026 Vagus Planner ·{' '}
          <Link
            to={createPageUrl('TermsOfService')}
            className="hover:text-white/60 transition-colors"
          >
            Terms of Service
          </Link>{' '}
          ·{' '}
          <Link to="/" className="hover:text-white/60 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
