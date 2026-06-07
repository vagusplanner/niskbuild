"use client";

import Layout from '@/app/components/Layout';

export default function TermsPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        <p className="text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using NiskBuild ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p>NiskBuild is an AI-powered app builder that generates code based on user prompts. Users can generate applications locally or via cloud AI, save projects, export code as ZIP, and deploy to various platforms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 13 years old to use the Service</li>
              <li>You are responsible for maintaining your account security</li>
              <li>You are responsible for all activity under your account</li>
              <li>You must provide accurate registration information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Subscription and Payments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Free tier: Limited to 1 project, watermarked exports</li>
              <li>Pro tier ($69/month): 3 projects, clean exports, priority AI</li>
              <li>Agency tier ($199/month): 15 projects, white-label previews</li>
              <li>Scale tier ($549/month): Unlimited projects, team seats</li>
              <li>Payments processed securely via Stripe</li>
              <li>Cancel anytime — no long-term contracts</li>
              <li>Refunds handled on a case-by-case basis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Code Ownership</h2>
            <p><strong>You own all code you generate using NiskBuild.</strong> When you export your project as ZIP, you receive full ownership of the generated code. No watermarks, no lock-in, no hidden fees. We claim no intellectual property rights over your generated applications.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Acceptable Use Policy</h2>
            <p>You may not use NiskBuild to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Generate illegal, harmful, or abusive content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Circumvent rate limits or abuse the API</li>
              <li>Reverse engineer or attempt to extract source code of the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. AI-Generated Content</h2>
            <p>AI-generated code is provided "as-is" without warranties of correctness or completeness. You are responsible for reviewing, testing, and modifying generated code before production use. NiskBuild uses Groq and Together AI for cloud generation, with local Ollama fallback for privacy-conscious users.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Cancellation and Termination</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may cancel your subscription at any time via your account settings</li>
              <li>Upon cancellation, you will retain access until the end of your billing period</li>
              <li>We may terminate accounts for violations of these terms</li>
              <li>Your projects will remain accessible but you cannot generate new code without an active subscription</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
            <p>NiskBuild is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability is limited to the amount you paid us in the previous 12 months.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Contact</h2>
            <p>Questions about these Terms? Contact us at <a href="mailto:hello@niskbuild.com" className="text-purple-400 hover:text-purple-300">hello@niskbuild.com</a></p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-nisk text-center text-nisk-muted text-sm">
          <p>NiskBuild — Build locally. Own forever.</p>
        </div>
      </div>
    </Layout>
  );
}