import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service · Vagus Planner',
  description: 'Interim accurate Terms of Service for Vagus Planner.',
  robots: { index: true, follow: true },
};

const LAST_UPDATED = 'July 13, 2026';
const SUPPORT_EMAIL = 'support@vagusplanner.com';

/**
 * Public App Store / web Terms of Service.
 * Interim draft — [LEGAL REVIEW NEEDED] markers must stay visible.
 */
export default function VagusPlannerPublicTermsPage() {
  return (
    <main className="min-h-screen bg-[#060f1e] text-white/80 py-12 px-4">
      <article className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-[#E8B84B]">Vagus Planner</p>
          <h1 className="text-3xl font-bold text-white">
            Terms of Service (Interim, Accurate Version)
          </h1>
          <p className="text-sm text-white/50">Last updated: {LAST_UPDATED}</p>
          <p className="text-sm leading-relaxed text-amber-200/90 border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2">
            <strong className="text-amber-100">[LEGAL REVIEW NEEDED]</strong> — this is an interim
            draft replacing a placeholder summary. Final legal language, entity name/details,
            governing law, and dispute resolution terms should be confirmed by counsel before this
            is treated as final.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">1. Acceptance of terms</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            By creating an account or using Vagus Planner, you agree to these Terms of Service and
            our Privacy Policy. If you do not agree, please do not use the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">2. Eligibility</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            You must be at least 13 years old to use Vagus Planner. By using the app, you confirm
            you meet this requirement.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">3. Description of service</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            Vagus Planner is a personal planning application offering calendar and task management,
            goal tracking, an optional Islamic edition (prayer times, Quran/hadith tools, Zakat
            calculations), optional wellness tracking features, and AI-assisted planning insights
            (where enabled and consented to).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">4. Your account</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            You&apos;re responsible for maintaining the confidentiality of your account credentials
            and for all activity under your account. Notify us promptly if you suspect unauthorized
            access.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">5. Subscriptions and payments</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            Some features require a paid subscription, processed via Stripe. Subscriptions renew
            automatically unless cancelled. You can manage or cancel your subscription in Settings.
            Refunds are handled in accordance with applicable app store policies (Apple App Store)
            where relevant.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">6. Acceptable use</h2>
          <p className="text-sm text-white/65">You agree not to:</p>
          <ul className="list-disc ml-5 text-sm text-white/65 space-y-1">
            <li>Use the app for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to our systems or other users&apos; data</li>
            <li>Reverse-engineer, decompile, or attempt to extract the app&apos;s source code</li>
            <li>Use the app in a way that could harm, disable, or overburden our services</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">7. Your content</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            You retain ownership of the data you enter into Vagus Planner (calendar entries, notes,
            prayer logs, etc.). We process this data as described in our Privacy Policy to provide
            the service to you.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">8. AI features</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            Some features use AI to generate suggestions or insights. AI-generated content is
            provided for informational and planning purposes only and should not be relied upon as
            professional, medical, financial, or religious advice. Use of AI features involving
            sensitive data (religious practice, health/wellness) requires your explicit separate
            consent, as described in our Privacy Policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">9. Termination</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            You may delete your account at any time in Settings, which immediately and permanently
            removes your data as described in our Privacy Policy. We may suspend or terminate
            accounts that violate these terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">10. Disclaimer</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            Vagus Planner is provided &quot;as is.&quot; We do not guarantee the accuracy of prayer
            time calculations, AI-generated content, or any other feature for any specific purpose,
            and recommend verifying critical information (such as prayer times) independently where
            accuracy is essential.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">11. Limitation of liability</h2>
          <p className="text-sm text-white/65 leading-relaxed border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2 text-amber-100/90">
            <strong>[LEGAL REVIEW NEEDED]</strong> — standard limitation of liability clause to be
            added by counsel, appropriate to applicable jurisdiction.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">12. Changes to these terms</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            We may update these terms from time to time. Continued use of the app after changes
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">13. Contact</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            Questions about these terms can be directed to{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#38bdf8] hover:underline">
              {SUPPORT_EMAIL}
            </a>
            .{' '}
            <span className="text-white/45">
              [LEGAL REVIEW NEEDED] Confirm support contact address.
            </span>
          </p>
        </section>

        <footer className="pt-6 border-t border-white/10 text-xs text-white/40 flex flex-wrap gap-4">
          <Link href="/vagus-planner/privacy" className="hover:text-white/70 underline">
            Privacy Policy
          </Link>
          <Link href="/" className="hover:text-white/70 underline">
            NiskBuild home
          </Link>
        </footer>
      </article>
    </main>
  );
}
