import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

const LOGO =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png';
const LAST_UPDATED = 'September 19, 2026';
const SUPPORT_EMAIL = 'support@vagusplanner.com';
const PUBLIC_PRIVACY_URL = 'https://vagusplanner.com/privacy';

/**
 * In-app Privacy Policy — must stay consistent with /vagus-planner/privacy
 * (app/vagus-planner/privacy/page.tsx).
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
              <h1 className="text-2xl font-black text-white">Vagus Planner Privacy Policy</h1>
              <p className="text-white/60 text-sm">
                How we collect, use, store, and protect your personal data
              </p>
            </div>
          </div>

          <div className="p-8 space-y-8 text-white/80">
            <p className="text-sm leading-relaxed text-white/70">
              This Privacy Policy explains how Vagus Planner (&quot;VP,&quot; &quot;we,&quot; &quot;us&quot;)
              collects, uses, stores, and protects your personal data when you use our mobile
              application and website (vagusplanner.com). Vagus Planner is a product of NiskBuild.
            </p>
            <p className="text-sm leading-relaxed text-white/55">
              This policy is written to be accurate and complete as of today. It has been reviewed for
              factual accuracy against our actual systems, but has not yet received final sign-off from
              outside legal counsel. We recommend treating it as authoritative in the meantime, and we
              will update this notice once that review is complete.
            </p>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">1. Who We Are</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                Vagus Planner is operated by NiskBuild. For any privacy questions or requests, contact
                us at{' '}
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
              <h2 className="text-lg font-bold text-white">2. What Data We Collect</h2>

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">Account &amp; Identity</h3>
                <ul className="list-disc ml-5 text-white/65 space-y-1.5 text-sm">
                  <li>Email address and authentication credentials</li>
                  <li>Full name (if provided)</li>
                  <li>
                    Date of birth (collected once, during initial consent, to confirm you meet our
                    minimum age requirement)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">Preferences &amp; Settings</h3>
                <ul className="list-disc ml-5 text-white/65 space-y-1.5 text-sm">
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

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">Content You Create</h3>
                <p className="text-white/65 text-sm leading-relaxed">
                  Depending on which features you use, we store: calendar events, categories,
                  meetings, reminders, and any shared/group calendar activity; tasks, goals, habits,
                  and habit completions; journal/reflection entries; trip and travel plans; expense
                  and budget entries you enter yourself; prayer logs, saved Islamic events, and saved
                  religious reference material (if Islamic Edition is enabled); period and
                  cycle-tracking entries (if you use this feature); chat messages, group discussions,
                  shared files, and live location (only if you actively use these collaboration
                  features).
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">Billing</h3>
                <ul className="list-disc ml-5 text-white/65 space-y-1.5 text-sm">
                  <li>Subscription status, invoice records, and usage counters</li>
                  <li>
                    We do not store your full card number — payment card details are handled entirely
                    by Stripe, our payment processor
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">
                  If You Connect Google Calendar
                </h3>
                <ul className="list-disc ml-5 text-white/65 space-y-1.5 text-sm">
                  <li>
                    We request read-only access to your primary Google Calendar (scope:{' '}
                    <code className="text-white/80">calendar.readonly</code>), plus basic profile
                    information (your Google account email) to confirm the connection
                  </li>
                  <li>
                    We do not request write access, and we do not modify or delete anything in your
                    Google Calendar
                  </li>
                  <li>We pull events from roughly 30 days in the past to 90 days in the future</li>
                  <li>
                    Your Google OAuth tokens are stored securely on our servers and are never exposed
                    to the app itself; you can disconnect this at any time from Account → Preferences
                    → Calendar Integrations
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">Device &amp; Technical Data</h3>
                <ul className="list-disc ml-5 text-white/65 space-y-1.5 text-sm">
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

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">Uploaded Files</h3>
                <ul className="list-disc ml-5 text-white/65 space-y-1.5 text-sm">
                  <li>
                    Any files or images you choose to upload are stored under a private, user-specific
                    storage path
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">Support Requests</h3>
                <ul className="list-disc ml-5 text-white/65 space-y-1.5 text-sm">
                  <li>
                    If you contact us through our support form, we store your message, contact
                    details, and category, so we can respond to you
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">3. Third-Party Services We Use</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We rely on the following processors to operate Vagus Planner. Each only receives the
                data necessary for its specific role: Supabase (our core database, authentication, and
                file storage); Stripe (payment processing and subscription billing); Resend (sending
                account and service emails — welcome, billing, password reset, reminders); Groq (AI
                processing — this is the only AI provider used for anything involving religious or
                health-related content, see Section 6); Together AI / Anthropic (backup AI providers
                used only for general, non-religious, non-health AI features, if Groq is unavailable);
                Aladhan API (calculating prayer times based on your location, Islamic Edition); Apple
                Push Notification service, APNs (delivering push notifications to your iPhone); Google
                (Calendar sync, if you choose to connect it); OpenStreetMap / Nominatim / Overpass
                (location lookups and finding nearby mosques or halal-friendly places); Vercel
                (hosting our servers and website).
              </p>
              <p className="text-white/65 text-sm mt-3">
                We do not sell your personal data to anyone, and we do not use your data for
                third-party advertising.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">4. How Long We Keep Your Data</h2>
              <ul className="list-disc ml-5 text-white/65 space-y-2 text-sm">
                <li>
                  If you cancel your subscription: your data is fully preserved. Only paid-tier
                  features become unavailable once your billing period ends. Nothing is deleted.
                </li>
                <li>
                  If you delete your account: we permanently and immediately delete your account data
                  across our systems, including all the content categories listed in Section 2, your
                  uploaded files, and (if connected) your Google Calendar tokens. This happens right
                  away — we do not hold a waiting period before deletion. (Note: our infrastructure
                  providers&apos; routine backups may retain copies for a short additional time as a
                  normal part of backup rotation, separate from our own systems.)
                </li>
                <li>
                  Currently, we do not automatically delete data for accounts that have simply gone
                  inactive without an explicit deletion request. We are evaluating adding an automated
                  retention policy for long-inactive accounts in a future update.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">5. Your Rights</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                You can, at any time: export your data (request a full export of everything we hold
                about you, in a portable format, from your Account settings); delete your account
                (permanently and immediately remove your account and all associated data); withdraw AI
                consent (turn off religious or health AI processing consent at any time from Account →
                Privacy &amp; Consent — this does not delete any data you&apos;ve already logged, it only
                stops AI features from processing that category of content going forward); contact us
                with any other privacy question or request at {SUPPORT_EMAIL}.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">
                6. Special Category Data (Religious and Health Information)
              </h2>
              <p className="text-white/65 text-sm mb-3 leading-relaxed">
                Some of what Vagus Planner helps you track — like prayer practice, Quran engagement,
                or health and wellness notes — falls under what data protection law calls &quot;special
                category&quot; personal data, which receives extra protection.
              </p>
              <p className="text-white/65 text-sm mb-3">
                Here&apos;s exactly how this works in Vagus Planner:
              </p>
              <ul className="list-disc ml-5 text-white/65 space-y-2 text-sm">
                <li>
                  Logging and storing this data is never blocked. You can use Islamic Edition
                  features, log prayers, track your cycle, or write wellness journal entries without
                  giving any special consent — these are core features you&apos;re choosing to use.
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
                  providers (Together AI or Anthropic), even if Groq is temporarily unavailable.
                  General, non-sensitive AI requests may use any of our AI providers.
                </li>
                <li>
                  Religious AI features specifically also require an active Islamic Edition
                  subscription.
                </li>
                <li>You can withdraw this consent at any time, as described in Section 5.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">7. Children&apos;s Privacy</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                Vagus Planner is not intended for children under 13. We ask you to confirm your date of
                birth and that you meet this minimum age requirement before you can use the app. We do
                not knowingly collect data from anyone under 13.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">8. International Data Transfers</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                Because we use globally-operating service providers (listed in Section 3), your data
                may be processed in countries outside your own, including the United States. Each of
                these providers maintains their own data protection safeguards appropriate to
                international transfers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">9. Security</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We use industry-standard measures to protect your data, including encrypted
                connections (HTTPS/TLS) for all data in transit, access controls limiting who can view
                your data, and secure credential storage. No system is perfectly secure, but we take
                reasonable, ongoing steps to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">10. Changes to This Policy</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We&apos;ll update the &quot;Last updated&quot; date at the top of this page whenever we
                make changes, and we&apos;ll make a reasonable effort to notify you of any material
                changes.
              </p>
            </section>

            <section className="pt-6 border-t border-white/10">
              <h2 className="text-lg font-bold text-white mb-3">11. Contact Us</h2>
              <p className="text-white/65 text-sm">
                Questions, requests, or concerns about this policy or your data:{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#38bdf8] hover:underline">
                  {SUPPORT_EMAIL}
                </a>{' '}
                or{' '}
                <Link to="/support" className="text-[#38bdf8] hover:underline">
                  vagusplanner.com/support
                </Link>
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
