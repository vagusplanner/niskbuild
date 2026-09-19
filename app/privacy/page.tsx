"use client";

import Layout from '@/app/components/Layout';

const LAST_UPDATED = 'September 19, 2026';

/**
 * NiskBuild platform Privacy Policy — approved draft (exact text).
 */
export default function PrivacyPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">NiskBuild Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-300">
          <section className="space-y-3">
            <p>
              This Privacy Policy explains how NiskBuild (&quot;we,&quot; &quot;us&quot;) collects, uses, stores,
              and protects your personal data when you use our platform at niskbuild.com.
            </p>
            <p>
              This policy is written to be accurate and complete as of today. It has been reviewed for
              factual accuracy against our actual systems, but has not yet received final sign-off from
              outside legal counsel. We recommend treating it as authoritative in the meantime, and we
              will update this notice once that review is complete.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Who We Are</h2>
            <p>
              NiskBuild is an AI-powered app-building platform. For any privacy questions or requests,
              contact us through our support system in your dashboard, or via the contact details on
              our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. What Data We Collect</h2>

            <h3 className="text-xl font-medium text-white mb-2 mt-4">Account &amp; Identity</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Email address and authentication credentials (or OAuth sign-in details, if you sign
                in via a third-party provider)
              </li>
              <li>Your profile information (name, subscription tier and status)</li>
              <li>
                Phone number and verification status — required for free-tier accounts as part of our
                anti-abuse measures; paid accounts can skip this
              </li>
              <li>
                Age confirmation — we verify you meet our minimum age requirement (13) at signup, but
                we do not store your date of birth itself; we only record the date on which you
                confirmed meeting this requirement
              </li>
              <li>
                Optional, coarse demographic information (a general age band and region) if you choose
                to provide it — never your exact birthdate
              </li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-2 mt-4">What You Build</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Prompts you write, project blueprints, generated code and version history, SEO
                metadata, and any project assets you create or upload
              </li>
              <li>
                Important: prompts you write are sent to our AI providers to generate results, and are
                stored as part of your project. Please don&apos;t include sensitive personal
                information (yours or anyone else&apos;s) directly in prompts.
              </li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-2 mt-4">Organizations &amp; Teams</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                If you&apos;re part of an organization on NiskBuild, we store membership and invite
                records
              </li>
              <li>
                Organization deletion requires either transferring/removing members or a typed
                confirmation, to prevent accidental data loss
              </li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-2 mt-4">Billing</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscription and payment status, linked to your Stripe customer record</li>
              <li>
                We do not store your full card number — payment details are handled entirely by Stripe
              </li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-2 mt-4">Support</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Records of support tickets you submit — including your message, contact details, and
                category — are kept to help us assist you; these are anonymized if you later delete
                your account
              </li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-2 mt-4">Storage</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Avatars, project assets, and any files you export or import through the platform
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Third-Party Services We Use</h2>
            <p>
              Supabase (authentication, our core database, and file storage); Stripe (payment
              processing and subscription billing); Resend (transactional and account-related email);
              Groq (default AI provider for code generation and agent features); Together AI /
              Anthropic (backup AI providers used if Groq is unavailable); Google (used only where you
              explicitly connect it, e.g. an optional Places import feature or Google sign-in — this
              is separate from any Vagus Planner-specific integration); Vercel (hosting our platform).
            </p>
            <p className="mt-4">
              We do not sell your personal data to anyone, and we do not use your data for third-party
              advertising.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. How Long We Keep Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                If you cancel your subscription: your projects and prompts are preserved. Only
                paid-tier features become unavailable.
              </li>
              <li>
                If you delete your account: we permanently delete your storage files, invite records,
                and signup/analytics records tied to you, anonymize any support tickets, and delete
                your projects, profile, and account. If you have an active Stripe subscription,
                it&apos;s cancelled as part of this process.
              </li>
              <li>
                We keep limited, fully de-identified aggregate statistics (like category-level usage
                trends) that are never tied back to your individual account, even after deletion —
                this helps us understand platform-wide patterns without retaining anything personal.
              </li>
              <li>
                Currently, we do not automatically delete data for accounts that have simply gone
                inactive.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Your Rights</h2>
            <p>
              Export your data (request a ZIP export of your account information, projects, and SEO
              data from your account settings — project source code should be exported separately from
              within each project); delete your account (from Settings → Danger Zone); manage
              analytics preferences (opt in or out of optional analytics from your privacy settings).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Children&apos;s Privacy</h2>
            <p>
              NiskBuild is not intended for anyone under 13. We verify age at signup (via email signup
              or an age-gate check for OAuth sign-ins) and do not knowingly collect data from anyone
              under this age. We record only that this confirmation happened, not your date of birth
              itself.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              7. AI Processing — Important Note
            </h2>
            <p>
              When you use NiskBuild&apos;s AI-powered features, your prompts and related project
              context are sent to our AI providers (Groq, and Together AI/Anthropic as backups) to
              generate results. This content becomes part of your stored project. Please avoid
              including sensitive personal data — yours or anyone else&apos;s — directly in prompts,
              since this content is processed by external AI systems and retained as part of your
              project history.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. International Data Transfers</h2>
            <p>
              Because we use globally-operating service providers (listed in Section 3), your data may
              be processed in countries outside your own, including the United States. Each of these
              providers maintains their own data protection safeguards appropriate to international
              transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Security</h2>
            <p>
              We use industry-standard measures to protect your data, including encrypted connections
              (HTTPS/TLS) for all data in transit, access controls limiting who can view your data,
              and secure credential storage. No system is perfectly secure, but we take reasonable,
              ongoing steps to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to This Policy</h2>
            <p>
              We&apos;ll update the &quot;Last updated&quot; date at the top of this page whenever we
              make changes, and we&apos;ll make a reasonable effort to notify you of any material
              changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Us</h2>
            <p>
              Questions, requests, or concerns about this policy or your data can be submitted through
              your NiskBuild dashboard support system.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-nisk text-center text-nisk-muted text-sm">
          <p>NiskBuild — Build locally. Own forever.</p>
        </div>
      </div>
    </Layout>
  );
}
