import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Ban, AlertTriangle, Scale, ArrowLeft } from 'lucide-react';

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png";

export default function TermsOfServicePage() {
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
          <span className="text-white/40 text-xs">Effective: March 2026</span>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#2a1a6e] to-[#1a4a8e] px-8 py-7 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#E8B84B]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Terms of Service</h1>
              <p className="text-white/60 text-sm">Please read these terms carefully before using Vagus Planner</p>
            </div>
          </div>

          <div className="p-8 space-y-8 text-white/80">

            <section>
              <h2 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                By accessing or using Vagus Planner ("the Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">2. Description of Service</h2>
              <p className="text-white/65 text-sm mb-3">Vagus Planner provides:</p>
              <ul className="list-disc ml-5 text-white/65 space-y-1 text-sm">
                <li>AI-powered calendar and smart scheduling</li>
                <li>Islamic living tools (prayer times, Quran, Zakat, Hajj guide)</li>
                <li>Health, wellness, sleep and mood tracking</li>
                <li>Finance tracking and Zakat calculation</li>
                <li>Travel planning and itinerary management</li>
                <li>Goals, habits and productivity tools</li>
                <li>Team and family collaboration features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#38bdf8]" /> 3. User Accounts
              </h2>
              <div className="space-y-2 text-white/65 text-sm">
                <p><strong className="text-white/80">3.1 Registration:</strong> You must provide accurate, complete information and keep it updated.</p>
                <p><strong className="text-white/80">3.2 Account Security:</strong> You are responsible for maintaining the confidentiality of your credentials.</p>
                <p><strong className="text-white/80">3.3 Age Requirement:</strong> You must be at least 13 years old to use this Service.</p>
                <p><strong className="text-white/80">3.4 Termination:</strong> We reserve the right to suspend accounts that violate these terms.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-400" /> 4. Prohibited Conduct
              </h2>
              <p className="text-white/65 text-sm mb-3">You agree NOT to:</p>
              <ul className="list-disc ml-5 text-white/65 space-y-1 text-sm">
                <li>Use the Service for illegal purposes</li>
                <li>Infringe on intellectual property rights</li>
                <li>Upload malicious code or viruses</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt unauthorised access to our systems</li>
                <li>Share offensive, discriminatory, or inappropriate content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">5. Intellectual Property</h2>
              <div className="space-y-2 text-white/65 text-sm">
                <p><strong className="text-white/80">5.1 Our Content:</strong> All features and functionality are owned by Vagus Planner and protected by intellectual property laws.</p>
                <p><strong className="text-white/80">5.2 Your Content:</strong> You retain ownership of content you create. You grant us a licence to store and display it solely to provide the Service.</p>
                <p><strong className="text-white/80">5.3 Islamic Content:</strong> Quranic verses and Hadiths are presented respectfully with proper attribution.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">6. Subscriptions &amp; Payments</h2>
              <div className="space-y-2 text-white/65 text-sm">
                <p><strong className="text-white/80">6.1 Free Plan:</strong> Basic features are provided free of charge with no time limit.</p>
                <p><strong className="text-white/80">6.2 Paid Plans:</strong> Premium features require a monthly or annual subscription billed via Stripe.</p>
                <p><strong className="text-white/80">6.3 Cancellation:</strong> You may cancel your subscription at any time from your Billing settings. Access continues until the end of the current billing period. No partial refunds for unused time.</p>
                <p><strong className="text-white/80">6.4 Refunds:</strong> Refunds may be issued within 14 days of initial purchase if you have not used premium features. Contact us via our <Link to="/Contact" className="text-[#38bdf8] hover:underline">Contact page</Link>.</p>
                <p><strong className="text-white/80">6.5 Price Changes:</strong> We will give at least 30 days' notice of any price changes before they affect your subscription.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">7. Third-Party Services</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We integrate with Google Calendar, Gmail, and other services. Your use of these integrations is subject to their respective terms. We are not responsible for third-party service availability or content.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> 8. Disclaimers
              </h2>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2 text-sm text-white/65">
                <p><strong className="text-white/80">Prayer Times:</strong> We strive for accuracy but recommend verifying with local Islamic authorities.</p>
                <p><strong className="text-white/80">Religious Guidance:</strong> AI-generated Islamic content is for informational purposes. Consult qualified scholars for rulings.</p>
                <p><strong className="text-white/80">Health Information:</strong> Wellness tracking is not medical advice. Consult healthcare professionals for medical concerns.</p>
                <p><strong className="text-white/80">"As Is" Service:</strong> The Service is provided "as is" without warranties of any kind.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#38bdf8]" /> 9. Limitation of Liability
              </h2>
              <p className="text-white/65 text-sm leading-relaxed">
                To the maximum extent permitted by law, Vagus Planner shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">10. Governing Law</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3">11. Changes to Terms</h2>
              <p className="text-white/65 text-sm leading-relaxed">
                We may modify these Terms at any time. We will notify users of material changes via email or in-app notification at least 30 days before they take effect. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className="pt-6 border-t border-white/10">
              <h2 className="text-lg font-bold text-white mb-3">12. Contact</h2>
              <p className="text-white/65 text-sm">For questions about these Terms, please use our <Link to="/Contact" className="text-[#38bdf8] hover:underline">Contact page</Link>. We aim to respond within 72 hours.</p>
            </section>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-center">
              <p className="text-white/50 text-xs">By using Vagus Planner, you acknowledge you have read, understood, and agree to be bound by these Terms.</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-white/30 text-xs">
          © 2026 Vagus Planner · <Link to="/PrivacyPolicy" className="hover:text-white/60 transition-colors">Privacy Policy</Link> · <Link to="/" className="hover:text-white/60 transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}