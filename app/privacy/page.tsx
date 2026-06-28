"use client";

import Link from 'next/link';
import Layout from '@/app/components/Layout';

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>Welcome to NiskBuild ("we", "our", "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI app builder platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium text-white mb-2 mt-4">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address and account credentials</li>
              <li>Billing information (processed securely by Stripe)</li>
              <li>Name and profile information</li>
            </ul>
            <h3 className="text-xl font-medium text-white mb-2 mt-4">Usage Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Project metadata (names, categories, timestamps)</li>
              <li>Anonymous build patterns (app categories, features used)</li>
              <li>Country or region for macro analytics (configurable in Settings — never precise GPS)</li>
              <li>Optional, self-reported age range (e.g. &quot;25-34&quot;) — never your date of birth</li>
              <li>Optional coarse town or city grouping where statistically safe — never street-level location</li>
              <li>Subscription tier and usage statistics</li>
            </ul>
            <h3 className="text-xl font-medium text-white mb-2 mt-4">What We DO NOT Collect</h3>
            <ul className="list-disc pl-6 space-y-2 text-emerald-400">
              <li>Your generated source code (stays on your machine)</li>
              <li>Your AI prompts (processed locally or via cloud API, not stored)</li>
              <li>Your client data or intellectual property</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our service</li>
              <li>To process your subscription payments</li>
              <li>To improve our AI models and template recommendations (anonymously)</li>
              <li>To communicate with you about updates and security</li>
              <li>To enforce our terms and prevent abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. How We Use Aggregate, Anonymized Data</h2>
            <p className="mb-4">
              To improve NiskBuild and to understand demand across different types of applications,
              we collect anonymized, aggregated usage trends. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                The general category of app you build (e.g. &quot;restaurant,&quot; &quot;finance,&quot;
                &quot;productivity&quot;) — we do not store the exact text of your prompts for this purpose.
              </li>
              <li>
                Your country and general region, and where statistically safe to do so, a coarser
                town-level grouping. We never collect precise GPS location.
              </li>
              <li>
                An optional, self-reported age range (e.g. &quot;25-34&quot;), never your exact date of birth.
              </li>
            </ul>
            <p className="mb-4">
              This data is never linked to your name, email, or account identity in any report,
              dashboard, or export we produce. Small data groupings (for example, a specific app
              category in a specific town) are automatically suppressed if too few users are
              represented, so individual users cannot be identified from any breakdown.
            </p>
            <p className="mb-4">
              We may use these aggregated, anonymized trends internally to guide product development,
              and we may, in the future, offer aggregated market-demand insights as a commercial
              product to third parties (such as businesses researching demand for certain app
              categories by region). Any such product will only ever contain aggregate statistics —
              never your individual prompts, projects, or identifying information.
            </p>
            <p>
              You can opt out of contributing to aggregate analytics at any time in{' '}
              <Link href="/settings" className="text-[var(--copper-melt)] hover:underline">
                Settings → Privacy
              </Link>
              , without affecting your ability to use NiskBuild.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Storage and Security</h2>
            <p>Your data is stored securely using Supabase (PostgreSQL). We implement industry-standard security measures including encryption at rest and in transit. Your generated code never touches our servers — it runs locally on your machine.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Third-Party Services</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase:</strong> User authentication and data storage</li>
              <li><strong>Stripe:</strong> Payment processing (PCI compliant)</li>
              <li><strong>Groq/Together AI:</strong> Cloud AI generation (only when you use Express Cloud mode)</li>
              <li><strong>Vercel:</strong> Application hosting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of aggregate analytics (<Link href="/settings" className="text-[var(--copper-melt)] hover:underline">Settings → Privacy</Link>)</li>
              <li>Export your project data as ZIP</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Data Retention</h2>
            <p>We retain your account information as long as your account is active. You may delete your account at any time, which will remove your profile and project metadata. Anonymous aggregate usage trends are retained for platform improvement and may be used in aggregated form only — no personal information is included.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Children&apos;s Privacy</h2>
            <p>Our service is not intended for children under 13. We do not knowingly collect information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please use our contact form:</p>
            <p className="mt-2">
              <Link href="/landing#contact" className="text-purple-400 hover:text-purple-300">
                Send us a message →
              </Link>
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