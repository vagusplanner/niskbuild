"use client";

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
              <li>Country or region for macro analytics (configurable in Settings — never GPS or city)</li>
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
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Storage and Security</h2>
            <p>Your data is stored securely using Supabase (PostgreSQL). We implement industry-standard security measures including encryption at rest and in transit. Your generated code never touches our servers — it runs locally on your machine.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Third-Party Services</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase:</strong> User authentication and data storage</li>
              <li><strong>Stripe:</strong> Payment processing (PCI compliant)</li>
              <li><strong>Groq/Together AI:</strong> Cloud AI generation (only when you use Express Cloud mode)</li>
              <li><strong>Vercel:</strong> Application hosting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of anonymous telemetry (Settings → Privacy &amp; Analytics)</li>
              <li>Export your project data as ZIP</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Data Retention</h2>
            <p>We retain your account information as long as your account is active. You may delete your account at any time, which will remove your profile and project metadata. Anonymous telemetry data is retained indefinitely for platform improvement (no personal information included).</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Children's Privacy</h2>
            <p>Our service is not intended for children under 13. We do not knowingly collect information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us at:</p>
            <p className="mt-2"><strong>Email:</strong> <a href="mailto:hello@niskbuild.com" className="text-purple-400 hover:text-purple-300">hello@niskbuild.com</a></p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-nisk text-center text-nisk-muted text-sm">
          <p>NiskBuild — Build locally. Own forever.</p>
        </div>
      </div>
    </Layout>
  );
}