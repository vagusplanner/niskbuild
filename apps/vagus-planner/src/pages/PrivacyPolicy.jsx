import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Database, Lock, Eye, Globe, ArrowLeft } from 'lucide-react';

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#060f1e' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-[#E8B84B] hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-4 h-4" />
            <img src={LOGO} alt="Vagus Planner" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-sm">Vagus Planner</span>
          </Link>
          <span className="text-white/40 text-xs">Last updated: March 2026</span>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          {/* Title bar */}
          <div className="bg-gradient-to-r from-[#1a4a6e] to-[#1a7ab8] px-8 py-7 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#E8B84B]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Privacy Policy</h1>
              <p className="text-white/60 text-sm">How Vagus Planner collects, uses and protects your data</p>
            </div>
          </div>

          <div className="p-8 space-y-8 text-white/80">

            <section>
              <h2 className="text-lg font-bold text-white mb-3">1. Introduction</h2>
              <p className="leading-relaxed text-white/70">
                Welcome to Vagus Planner ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our application and services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#38bdf8]" /> 2. Information We Collect
              </h2>
              <div className="space-y-4 ml-2">
                <div>
                  <h3 className="font-semibold text-white/90 mb-2">2.1 Personal Information</h3>
                  <ul className="list-disc ml-5 text-white/65 space-y-1 text-sm">
                    <li>Full name and email address</li>
                    <li>Prayer and Islamic practice preferences</li>
                    <li>Location data (for prayer times and Qibla direction)</li>
                    <li>Payment information (processed securely via Stripe)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 mb-2">2.2 Usage & Health Data</h3>
                  <ul className="list-disc ml-5 text-white/65 space-y-1 text-sm">
                    <li>Calendar events and tasks you create</li>
                    <li>Prayer logs and spiritual tracking data</li>
                    <li>Health, sleep, mood and wellness information you input</li>
                    <li>Financial records you log (income, expenses, Zakat)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 mb-2">2.3 Technical Data</h3>
                  <ul className="list-disc ml-5 text-white/65 space-y-1 text-sm">
                    <li>Device information and browser type</li>
                    <li>IP address and approximate location</li>
                    <li>Cookies and session tokens for authentication</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#38bdf8]" /> 3. How We Use Your Information
              </h2>
              <ul className="list-disc ml-5 text-white/65 space-y-2 text-sm">
                <li>Provide, maintain and improve our services</li>
                <li>Calculate accurate prayer times for your location</li>
                <li>Send reminders and notifications you have enabled</li>
                <li>Personalise your experience with AI recommendations</li>
                <li>Process payments and manage your subscription</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#38bdf8]" /> 4. Data Sharing
              </h2>
              <p className="text-white/65 text-sm mb-3">We <strong className="text-white">do not sell</strong> your personal information. We may share data only in these circumstances:</p>
              <ul className="list-disc ml-5 text-white/65 space-y-2 text-sm">
                <li><strong className="text-white/80">Service Providers:</strong> Trusted third parties (cloud hosting, AI services, Stripe for payments)</li>
                <li><strong className="text-white/80">Legal Requirements:</strong> When required by law or to protect rights and safety</li>
                <li><strong className="text-white/80">With Your Consent:</strong> When you explicitly agree (e.g. sharing calendar with another user)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#38bdf8]" /> 5. Data Security
              </h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We implement industry-standard security measures including encryption in transit and at rest, secure authentication, and access controls. Payments are handled by Stripe and never stored on our servers. No transmission method is 100% secure, but we continuously improve our security practices.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">6. Your Rights (GDPR / UK GDPR)</h2>
              <p className="text-white/65 text-sm mb-3">You have the right to:</p>
              <ul className="list-disc ml-5 text-white/65 space-y-1 text-sm">
                <li><strong className="text-white/80">Access</strong> — Request a copy of your personal data</li>
                <li><strong className="text-white/80">Rectification</strong> — Correct inaccurate data</li>
                <li><strong className="text-white/80">Erasure</strong> — Request deletion ("right to be forgotten")</li>
                <li><strong className="text-white/80">Portability</strong> — Export your data</li>
                <li><strong className="text-white/80">Restriction</strong> — Limit how we process your data</li>
                <li><strong className="text-white/80">Objection</strong> — Object to certain processing</li>
                <li><strong className="text-white/80">Withdraw Consent</strong> — At any time, without affecting past processing</li>
              </ul>
              <p className="text-white/50 text-sm mt-3">To exercise these rights, use the Settings page in-app or contact us via our <Link to="/Contact" className="text-[#38bdf8] hover:underline">Contact page</Link>.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">7. Cookies</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We use essential cookies for authentication and session management. We may also use analytics cookies to understand usage patterns. You can control cookies through your browser settings or via the cookie preference panel shown on first visit. Disabling essential cookies may affect core functionality.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">8. Data Retention</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We retain your data only as long as necessary to provide the service or as required by law. Upon account deletion, your personal data is deleted or anonymised within 30 days, except where legal obligations require longer retention.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">9. International Transfers</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                Your data may be processed outside your country of residence. We ensure appropriate safeguards through standard contractual clauses and compliance with applicable data protection laws including UK GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">10. Children's Privacy</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                Our service is not intended for children under 13. We do not knowingly collect data from children. If you believe we have, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">11. Changes to This Policy</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We may update this policy periodically. We will notify you of significant changes via email or in-app notification. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className="pt-6 border-t border-white/10">
              <h2 className="text-lg font-bold text-white mb-3">12. Contact Us</h2>
              <p className="text-white/65 text-sm mb-3">For privacy-related questions or data requests, please use our <Link to="/Contact" className="text-[#38bdf8] hover:underline">Contact page</Link>. We aim to respond within 72 hours.</p>
            </section>
          </div>
        </div>

        <div className="text-center mt-8 text-white/30 text-xs">
          © 2026 Vagus Planner · <Link to="/TermsOfService" className="hover:text-white/60 transition-colors">Terms of Service</Link> · <Link to="/" className="hover:text-white/60 transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}