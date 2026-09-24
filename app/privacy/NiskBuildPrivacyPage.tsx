'use client';

import Layout from '@/app/components/Layout';

const LAST_UPDATED = 'September 24, 2026';

/**
 * NiskBuild platform Privacy Policy — approved draft (exact text).
 */
export default function NiskBuildPrivacyPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">NiskBuild Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-300">
          <section className="space-y-3">
            <p>
              This Privacy Policy explains how NiskBuild (&quot;we,&quot; &quot;us&quot;) collects, uses, stores,
              and protects your personal data when you use our platform.
            </p>
            <p>
              This policy is written to be accurate and complete as of today, based on a full
              technical review of our systems. It has not yet received final sign-off from outside
              legal counsel — we recommend treating it as an accurate, good-faith account of our real
              practices in the meantime, and we will update this notice once that review is complete.
              One item below is flagged as needing specific legal review before we can make a
              definitive compliance statement about it — see Section 8.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Who We Are</h2>
            <p>
              NiskBuild is an AI-powered app-building platform. For privacy questions or requests,
              contact us through your dashboard support system.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. What Data We Collect</h2>

            <h3 className="text-xl font-medium text-white mb-2 mt-4">Account &amp; Identity</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Email address and authentication credentials (or OAuth details, if you sign in via a
                third-party provider)
              </li>
              <li>Your profile information (name, subscription tier and status)</li>
              <li>
                Phone number and verification status - required for free-tier accounts; paid accounts
                can skip this
              </li>
              <li>
                Age confirmation - we verify you meet our minimum age requirement (13) at signup, but
                we do not store your date of birth, only the date you confirmed meeting this
                requirement
              </li>
              <li>
                Optional, coarse demographic information, never your exact birthdate
              </li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-2 mt-4">What You Build</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Prompts you write, project blueprints, generated code and file versions, SEO
                metadata, and any project assets you create or upload
              </li>
              <li>
                Your build history: we keep a record of every attempt to generate or edit a page in a
                project - not just successful results, but also interrupted or failed attempts -
                including the prompt, the outcome, which AI model was used, and how many credits it
                cost. This helps you review your own session and helps us improve reliability. This
                history is deleted when its project is deleted.
              </li>
              <li>
                Important: prompts you write are sent to our AI providers to generate results, and are
                stored as part of your project and build history. Please don&apos;t include sensitive
                personal information (yours or anyone else&apos;s) directly in prompts.
              </li>
              <li>
                If you choose to use your own API key for an AI provider (available on paid plans),
                that key is stored securely on your account so we can use it on your behalf; we never
                use it for any purpose other than fulfilling your own generation requests.
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

            <h3 className="text-xl font-medium text-white mb-2 mt-4">Billing &amp; Credits</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscription and payment status, linked to your Stripe customer record</li>
              <li>
                Your cloud AI credit balance, and records of credit-reload-pack purchases (processed
                via Stripe)
              </li>
              <li>
                Which AI model you used and how many credits each generation cost, so we can
                accurately track your usage against your plan
              </li>
              <li>
                We do not store your full card number - payment details are handled entirely by Stripe
              </li>
            </ul>

            <h3 className="text-xl font-medium text-white mb-2 mt-4">Support</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Records of support tickets you submit are kept to help us assist you; anonymized if
                you later delete your account
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
              AI generation providers - which of these receives your prompt depends on which model
              you select for a given generation (or the default, if you don&apos;t choose one):
              DeepSeek (default model), Google (Gemini models), OpenAI (GPT models), Anthropic
              (Claude models), Groq (used for some generations and as an internal reliability
              fallback), Together AI (fallback path).
            </p>
            <p className="mt-4">
              Other services: Supabase (database, authentication, file storage); Stripe (payment
              processing and subscription/credit billing); Resend (transactional email); Vercel
              (hosting); Sentry (technical error monitoring, to help us catch and fix bugs); Umami
              (privacy-focused product analytics); Google (also used separately for Places import and
              sign-in, where you explicitly connect it).
            </p>
            <p className="mt-4">
              We do not sell your personal data, and we do not use it for third-party advertising.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. International Data Transfers</h2>
            <p>
              Because we use globally-operating service providers, your data may be processed in
              countries outside your own, including the United States.
            </p>
            <p className="mt-4">
              A specific note on DeepSeek: DeepSeek is based in China. If you are in the EU/UK and
              select DeepSeek as your generation model (including as the default), your prompt and
              related project data may be transferred to China for processing. We have not yet
              completed the legal review needed to confirm what specific safeguards this transfer
              requires or whether additional measures need to be put in place - this is a genuine
              open item, not something we can make a compliance claim about yet. If this matters to
              you, you can choose a different AI model in the picker for your generations in the
              meantime. We&apos;ll update this policy once we&apos;ve completed that review.
            </p>
            <p className="mt-4">
              For our other providers (US-based), we rely on the safeguards those providers maintain
              for international transfers; we are in the process of confirming these meet current
              EU/UK standards as part of the same legal review.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. How Long We Keep Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                If you cancel your subscription: your projects and prompts are preserved. Only
                paid-tier features become unavailable.
              </li>
              <li>
                If you delete your account: we permanently delete your storage files, invite records,
                and signup/analytics records tied to you, anonymize any support tickets, and delete
                your projects, profile, build history, and account. If you have an active Stripe
                subscription, it&apos;s cancelled as part of this process.
              </li>
              <li>
                Build history (prompts, generation outcomes) is kept until its associated project is
                deleted, then removed automatically.
              </li>
              <li>
                We keep limited, fully de-identified aggregate statistics that are never tied back to
                your individual account, even after deletion.
              </li>
              <li>
                We do not currently automatically delete data for accounts that have simply gone
                inactive.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Export your data: request an export of your account, project, and SEO data from your
                account settings. Note: this export currently covers projects and SEO data; build
                history and detailed credit records are not yet included in the automated export -
                contact support if you need these specifically.
              </li>
              <li>Delete your account: from Settings → Danger Zone</li>
              <li>
                Access, correct, or object to our processing of your data: contact us through your
                dashboard support system
              </li>
              <li>
                Manage analytics preferences: opt in or out of optional analytics from your privacy
                settings
              </li>
              <li>
                Lodge a complaint: if you&apos;re in the EU/UK, you have the right to complain to
                your local data protection authority if you believe we&apos;ve mishandled your data
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Security</h2>
            <p>
              We use encrypted connections (HTTPS/TLS) for all data in transit, access controls
              limiting who can view your data, and secure credential storage - including for any
              personal AI provider keys you choose to store with us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              8. Open Items Pending Legal Review
            </h2>
            <p className="mb-3">
              In the interest of transparency, here&apos;s what we know still needs a lawyer&apos;s
              input before we can call this policy complete:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The DeepSeek/China transfer question (Section 4) - our highest-priority open item
              </li>
              <li>
                Confirming the specific legal basis (under GDPR Article 6) for each category of
                processing described above
              </li>
              <li>
                A complete, formal retention-period table for each data category, rather than the
                event-based descriptions above
              </li>
              <li>
                Confirming our controller details meet full Article 13 requirements
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Changes to This Policy</h2>
            <p>
              We&apos;ll update the &quot;Last updated&quot; date whenever we make changes, and make
              a reasonable effort to notify you of material changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Contact Us</h2>
            <p>
              Questions or requests can be submitted through your NiskBuild dashboard support system.
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
