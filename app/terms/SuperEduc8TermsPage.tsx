import Link from 'next/link';
import AuthProductShell from '@/app/components/auth/AuthProductShell';

const LAST_UPDATED = 'September 20, 2026';

/**
 * SuperEduc8 Terms of Service — concise draft pending formal legal review (children's platform).
 */
export default function SuperEduc8TermsPage() {
  return (
    <AuthProductShell brand="supereduc8">
      <main className="flex-1 px-4 py-10 sm:py-14">
        <article className="mx-auto max-w-3xl space-y-8 text-[var(--foreground)]">
          <header className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              SuperEduc8 Terms of Service
            </h1>
            <p className="text-sm text-[var(--muted)]">Last updated: {LAST_UPDATED}</p>
            <div
              className="rounded-xl border px-4 py-3 text-sm leading-relaxed"
              style={{
                borderColor: '#f0c4b0',
                background: 'rgba(224, 90, 37, 0.08)',
                color: '#7a2f12',
              }}
            >
              <p>
                <strong>Important note:</strong> These terms accurately describe how SuperEduc8
                works today, including our pricing and account rules for students ages 7–17. Because
                SuperEduc8 serves children, this document is undergoing formal legal review (alongside
                our Privacy Policy) to ensure it meets requirements for children&apos;s services. We
                are publishing this clear draft now so families have honest information; we will
                update it when that review concludes.
              </p>
            </div>
          </header>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">1. Agreement</h2>
            <p>
              By creating an account or using SuperEduc8, you agree to these Terms and our{' '}
              <Link href="/privacy" className="text-[var(--primary)] hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the service.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">2. Who SuperEduc8 Is For</h2>
            <p>
              SuperEduc8 is an AI learning platform for students ages 7 to 17, with tools for
              parents/guardians, mentors, and teachers.
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Students 13 and older may create their own account.</li>
              <li>
                Students under 13 may only get an account after a parent or guardian provides consent
                through our supervised/family signup flow.
              </li>
              <li>
                Parents/guardians who approve a child&apos;s account are responsible for that
                child&apos;s use of SuperEduc8 and for keeping consent and contact details accurate.
              </li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">3. Accounts and Responsibilities</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Keep login credentials confidential; you are responsible for activity on your account.</li>
              <li>
                Provide accurate registration information (including age band and parent email where
                required).
              </li>
              <li>
                For under-13 accounts, the parent/guardian remains the responsible party for the
                account and may request deactivation or deletion as described in our Privacy Policy.
              </li>
              <li>
                Do not share accounts in a way that bypasses age or consent rules.
              </li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">4. Subscriptions and Billing</h2>
            <p>
              Current plans (display pricing; billing checkout may be introduced in stages):
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Free</strong> — $0/month: limited daily AI tutor access; basic flashcards
                &amp; quizzes.
              </li>
              <li>
                <strong>Free Trial</strong> — 14 days of full access, no credit card required to
                start.
              </li>
              <li>
                <strong>Student</strong> — $9.99/month (or $99.90/year): unlimited AI tutor, homework
                scanning, essay feedback, full curriculum access.
              </li>
              <li>
                <strong>Family additional child</strong> — +$6.99/month per child (or $69.90/year):
                same full access for each extra child on the account.
              </li>
              <li>
                <strong>Multi-Curriculum</strong> — 20% off combined pricing when a student follows
                more than one national curriculum.
              </li>
              <li>
                <strong>Teacher/School</strong> — custom pricing; contact us.
              </li>
            </ul>
            <p>
              Annual Student and additional-child prices reflect two months free versus paying
              monthly. You may cancel anytime. If a paid subscription lapses, learning data is not
              deleted solely for that reason — premium features pause until access is restored or the
              account is deleted.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">5. Acceptable Use</h2>
            <p>You (and students you supervise) may not use SuperEduc8 to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Harass, bully, or harm others, or generate abusive or illegal content</li>
              <li>Cheat on assessed work in a way that violates school rules (use the tutor to learn, not to submit AI work as solely your own when prohibited)</li>
              <li>Attempt to break security, scrape, or abuse rate limits</li>
              <li>Upload content you do not have rights to share</li>
              <li>Use the service for advertising, spam, or selling student data</li>
            </ul>
            <p>We may suspend or deactivate accounts that violate these rules.</p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">6. AI Features — Important Limits</h2>
            <p>
              SuperEduc8 uses AI (currently Groq) for tutoring, homework photo help, essay feedback,
              and related features. AI output can be wrong or incomplete. Students and parents remain
              responsible for checking answers against school expectations. We do not guarantee
              grades, exam results, or academic outcomes.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">7. Intellectual Property</h2>
            <p>
              SuperEduc8&apos;s software, branding, and platform content belong to us or our
              licensors. Students retain rights to their own written work they submit. You grant us a
              limited license to process that content solely to provide the service (for example,
              generating feedback).
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, SuperEduc8 is provided &quot;as is.&quot; We
              are not liable for indirect, incidental, or consequential damages, or for academic
              outcomes, school decisions, or interruptions beyond our reasonable control. Nothing in
              these terms limits rights that cannot be limited under applicable consumer or child
              protection law.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">9. Changes</h2>
            <p>
              We may update these Terms, especially while legal review is ongoing. We will update the
              date above and make reasonable efforts to notify parents of material changes that affect
              children&apos;s accounts.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">10. Contact</h2>
            <p>
              Questions about these Terms, billing, or a child&apos;s account can be sent through our
              support contact after signup, or via the contact options on our website.
            </p>
          </section>

          <footer className="border-t border-[var(--border)] pt-6 text-center text-sm text-[var(--muted)]">
            <p>
              <Link href="/privacy" className="text-[var(--primary)] hover:underline">
                Privacy Policy
              </Link>
              {' · '}
              <Link href="/" className="text-[var(--primary)] hover:underline">
                Back to SuperEduc8
              </Link>
            </p>
          </footer>
        </article>
      </main>
    </AuthProductShell>
  );
}
