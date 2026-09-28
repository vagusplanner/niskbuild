import Navbar from "../components/Navbar";
import FooterSection from "../components/landing/FooterSection";
import { useState } from "react";

const privacy = `
## Privacy Policy

**Last updated: May 2026**

### 1. Who We Are
North South Consulting ("we", "us", "our") is an executive communication and coaching consultancy operating internationally. This policy explains how we collect, use, and protect your personal data in compliance with the UK GDPR and EU GDPR.

### 2. Data We Collect
- Account data: name and email address when you register or book a session.
- Session data: written text, speech transcripts, or other content you submit to our AI coaching tools for analysis.
- Booking data: preferred dates, times, session types, and correspondence related to your sessions.
- Usage data: how you interact with our platform via standard analytics (pages visited, tools used).
- Payment data: processed securely by Stripe — we do not store payment card details.

### 3. Legal Basis for Processing (GDPR)
We process your data on the following legal bases: (a) Contract — to deliver the services you have requested; (b) Legitimate Interests — to improve our platform; (c) Consent — for marketing communications, which you may withdraw at any time.

### 4. How We Use Your Data
- To deliver coaching sessions and AI analysis you request.
- To send booking confirmations, calendar invites, and session reminders.
- To personalise your coaching experience and track progress.
- To improve our platform and services.
- We do not sell your data to third parties. Ever.

### 5. Data Storage & Security
Your data is stored on secure, encrypted servers (AES-256). Session content submitted to AI tools is processed via our AI provider and is not used to train AI models. We retain your data for as long as your account is active plus 2 years, after which it is securely deleted.

### 6. International Transfers
Where data is transferred outside the UK/EEA, we ensure appropriate safeguards are in place (Standard Contractual Clauses or equivalent).

### 7. Your Rights (UK & EU GDPR)
You have the right to: access your data, correct inaccuracies, request deletion ("right to be forgotten"), restrict or object to processing, data portability, and to withdraw consent at any time. To exercise any right, submit a request through our platform or contact us via the form on our website. We will respond within 30 days.

### 8. Cookies
We use essential cookies (for authentication and session management) and optional analytics cookies. A cookie consent banner is displayed on your first visit. You may change preferences at any time via your browser settings.

### 9. Children's Data
Our services are intended for adults aged 18 and over. We do not knowingly collect data from children.

### 10. Changes to This Policy
We may update this policy. Significant changes will be notified to registered users by email.
`;

const terms = `
## Terms of Service

**Last updated: May 2026**

### 1. Acceptance
By accessing or using the North South Consulting platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.

### 2. Services
We provide AI-powered communication coaching tools and human coaching sessions. AI-generated feedback is for coaching purposes only — it is not a substitute for professional medical, legal, financial, or therapeutic advice.

### 3. Subscriptions & Payment
- Subscriptions are charged in advance for the selected billing period (monthly or annual).
- Payment is processed securely via Stripe.
- You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period — no partial refunds are issued for unused time.
- New subscribers are entitled to a 14-day satisfaction guarantee. If you are not satisfied, contact us within 14 days of your first payment for a full refund.
- Prices are displayed exclusive of applicable taxes where required by law.

### 4. Acceptable Use
You agree not to: submit harmful, unlawful, abusive, or defamatory content; attempt to reverse-engineer, copy, or exploit our AI systems; share or sell account access; use the platform for any commercial purpose without our written consent.

### 5. Intellectual Property
All platform content, AI tools, branding, and materials are the property of North South Consulting or its licensors. Content you submit for coaching analysis remains your property. By submitting content, you grant us a limited licence to process it solely for the purpose of providing our services.

### 6. Confidentiality
All session content is treated as strictly confidential. We do not share client session data with third parties without consent, except where required by law.

### 7. Limitation of Liability
North South Consulting is not liable for any decisions made based on coaching feedback, or for any indirect, incidental, or consequential loss. Our maximum aggregate liability for any claim is limited to the total fees paid in the 30 days preceding the claim.

### 8. Governing Law & Jurisdiction
These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.

### 9. Changes to Terms
We reserve the right to update these Terms at any time. Material changes will be communicated to registered users with at least 14 days' notice.
`;

function renderMarkdown(text) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h2 key={i} className="font-cormorant text-3xl font-light text-foreground mt-8 mb-4">{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} className="font-cormorant text-xl font-medium text-foreground mt-6 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-inter text-sm font-medium text-muted-foreground mb-3">{line.replace(/\*\*/g, '')}</p>;
    if (line.startsWith('- ')) return <li key={i} className="font-inter text-sm text-muted-foreground ml-4 mb-1">{line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="font-inter text-sm text-muted-foreground leading-relaxed mb-2">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
  });
}

export default function Legal() {
  const [tab, setTab] = useState("privacy");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-28">
        <div className="text-center mb-10 space-y-3">
          <h1 className="font-cormorant text-4xl font-light text-foreground">Legal</h1>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setTab("privacy")}
              className={`font-inter text-sm px-5 py-2 rounded-full transition-colors ${tab === "privacy" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setTab("terms")}
              className={`font-inter text-sm px-5 py-2 rounded-full transition-colors ${tab === "terms" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
            >
              Terms of Service
            </button>
          </div>
        </div>

        <div className="bg-card rounded-3xl border border-border p-8 md:p-12">
          {renderMarkdown(tab === "privacy" ? privacy : terms)}
        </div>
      </div>
      <FooterSection />
    </div>
  );
}