import Link from 'next/link';
import AuthProductShell from '@/app/components/auth/AuthProductShell';

const LAST_UPDATED = 'September 20, 2026';

/**
 * SuperEduc8 Privacy Policy — accurate draft pending formal legal review (exact text).
 */
export default function SuperEduc8PrivacyPage() {
  return (
    <AuthProductShell brand="supereduc8">
      <main className="flex-1 px-4 py-10 sm:py-14">
        <article className="mx-auto max-w-3xl space-y-8 text-[var(--foreground)]">
          <header className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              SuperEduc8 Privacy Policy — For Students, Parents, and Teachers
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
                <strong>Important note before you read further:</strong> This policy accurately
                describes what SuperEduc8 actually collects, stores, and does with data today, based
                on a full technical review of our systems. However, because SuperEduc8 serves children
                as young as 7, this policy — and in particular our parental consent process — is
                currently undergoing formal legal review to ensure it meets all requirements under
                laws like the U.S. Children&apos;s Online Privacy Protection Act (COPPA) and
                applicable data protection law for minors. We are publishing this accurate draft now
                so parents have real, honest information, while we complete that review. We will
                update this notice as that process concludes.
              </p>
            </div>
          </header>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">1. Who We Are</h2>
            <p>
              SuperEduc8 is an AI-powered learning platform for students, with tools for parents and
              teachers to support that learning. This policy applies to everyone who uses SuperEduc8
              - students, parents/guardians, mentors, and teachers.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">2. Age Requirements and How Signup Works</h2>
            <p>SuperEduc8 is designed for students ages 7 to 17.</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Students 13 and older can create their own account directly.</li>
              <li>
                Students under 13 cannot sign themselves up. A parent or guardian must provide their
                email address and give consent before a child&apos;s account is created. We currently
                do this by sending the parent/guardian an email with an approval link, which expires
                after 72 hours if not used. We want to be transparent: we are currently reviewing
                whether this consent method meets the specific legal standard required for
                children&apos;s services, and may strengthen this process (for example, requiring a
                more robust verification step) as a result of that review.
              </li>
              <li>
                Parents/guardians who approve a child&apos;s account automatically get ongoing access
                to a parent dashboard showing that child&apos;s learning progress.
              </li>
            </ul>
          </section>

          <section className="space-y-4 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">3. What We Collect</h2>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">From Students</h3>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  Name and login credentials (email, or for younger/supervised students, an account
                  we help set up - never one the child creates unsupervised)
                </li>
                <li>
                  Age band (a range like &quot;7-8&quot; or &quot;13-14,&quot; not an exact birthdate)
                </li>
                <li>
                  School-related info: year group, curriculum followed, preferred study language,
                  favorite subjects
                </li>
                <li>
                  Homework photos - if a student uses homework scanning, we temporarily store the
                  photo (by default deleted automatically after 48 hours, or up to 30 days if the
                  student chooses to keep it longer) and send it to our AI provider to generate
                  feedback
                </li>
                <li>
                  Voice input - if a student uses Voice Buddy or Voice Tutor, their spoken words are
                  converted to text directly in their browser; we do not send audio recordings to our
                  servers, only the resulting text
                </li>
                <li>
                  Conversations with the AI tutor - we keep a record of these so a student can pick
                  up where they left off, and so we can review for safety and appropriate use. These
                  are visible to the student on their own account. Parents and teachers do not
                  currently see the full content of these conversations - they see summaries of
                  learning progress (like topics covered and time spent), not the actual conversation
                  text.
                </li>
                <li>
                  Essays and written work a student submits, along with AI-generated feedback
                </li>
                <li>
                  Learning activity: planner items, quiz/flashcard results, mastery tracking, grade
                  estimates
                </li>
                <li>
                  Shared group notes and flashcard sets, if a student participates in a study group
                  (this is not private messaging between students)
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">From Parents/Guardians</h3>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  Email address (for the consent process and ongoing progress updates)
                </li>
                <li>
                  Access to your child&apos;s learning progress through a secure parent dashboard
                  link
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">From Teachers</h3>
              <ul className="list-disc space-y-2 pl-6">
                <li>Account and school information</li>
                <li>
                  Access to aggregate class/student progress data (not individual conversation or
                  essay content)
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">4. Who Can See What</h2>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[#f3f7fd]">
                    <th className="px-3 py-2.5 font-semibold">Data</th>
                    <th className="px-3 py-2.5 font-semibold">Student</th>
                    <th className="px-3 py-2.5 font-semibold">Parent/Guardian</th>
                    <th className="px-3 py-2.5 font-semibold">Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border)] align-top">
                    <td className="px-3 py-2.5">Their own AI tutor conversations</td>
                    <td className="px-3 py-2.5">Full access</td>
                    <td className="px-3 py-2.5">Progress summary only</td>
                    <td className="px-3 py-2.5">Aggregate only</td>
                  </tr>
                  <tr className="border-b border-[var(--border)] align-top">
                    <td className="px-3 py-2.5">Learning progress (mastery, activity)</td>
                    <td className="px-3 py-2.5">Yes</td>
                    <td className="px-3 py-2.5">Yes</td>
                    <td className="px-3 py-2.5">Yes (aggregate)</td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Homework photos &amp; essays</td>
                    <td className="px-3 py-2.5">Yes</td>
                    <td className="px-3 py-2.5">No</td>
                    <td className="px-3 py-2.5">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">5. Third-Party Services We Use</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Supabase - our core database, authentication, and file storage</li>
              <li>
                Groq - our AI provider for tutoring conversations, essay feedback, homework photo
                analysis, and all other AI-powered features. This means homework photos and written
                content are sent to Groq to generate feedback.
              </li>
              <li>
                Resend - sending parental consent emails, welcome emails, and progress notifications
              </li>
              <li>
                Sentry - technical error monitoring, to help us catch and fix bugs
              </li>
            </ul>
            <p>
              We do not use SuperEduc8 student data for advertising, and we do not sell student data
              to anyone.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">6. How Long We Keep Data</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Homework photos: automatically deleted after 48 hours by default, or up to 30 days if
                a student chooses to extend that.
              </li>
              <li>
                Everything else (chat history, essays, learning progress, planner data): currently
                kept until the account is deleted. We recognize this should have a clearer, more
                limited retention period given this is children&apos;s data, and are working on
                adding a specific retention/deletion policy for this rather than keeping it
                indefinitely.
              </li>
              <li>
                Account deletion: deleting an account removes the associated student record and
                related data. We are also reviewing our deletion process to confirm homework photos
                stored in our file system are fully and reliably removed alongside the database
                record, not just the database entry itself.
              </li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">7. Parents&apos; Rights</h2>
            <p>
              As a parent or guardian, you can: review what learning progress data we have about your
              child through your parent dashboard; request your child&apos;s account be deleted at
              any time by contacting us; withdraw consent for your child&apos;s account at any time,
              which will deactivate the account.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">8. Security</h2>
            <p>
              We use encrypted connections (HTTPS/TLS) for all data in transit, and access controls
              limiting who can view student data based on their role (student, parent, teacher). No
              system is perfectly secure, but we take reasonable, ongoing steps to protect
              children&apos;s information specifically, given its sensitivity.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">9. Changes to This Policy</h2>
            <p>
              Given this policy is currently under active legal review, we expect to update it.
              We&apos;ll update the date at the top whenever we do, and will make reasonable efforts
              to notify parents of any material changes, especially anything affecting how their
              child&apos;s data is handled.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed sm:text-base">
            <h2 className="text-xl font-semibold">10. Contact Us</h2>
            <p>
              Questions or requests about your child&apos;s data, including deletion requests, can be
              sent through our support contact.
            </p>
          </section>

          <footer className="border-t border-[var(--border)] pt-6 text-center text-sm text-[var(--muted)]">
            <p>
              <Link href="/login" className="text-[var(--primary)] hover:underline">
                Back to sign in
              </Link>
            </p>
          </footer>
        </article>
      </main>
    </AuthProductShell>
  );
}
