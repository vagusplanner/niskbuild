"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSafeSession } from '@/lib/supabaseSession';
import PricingCards from '@/app/components/PricingCards';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import AppTopNav from '@/app/components/AppTopNav';
import TryItNowDemo from '@/app/components/TryItNowDemo';
import LandingSectionNav from '@/app/components/LandingSectionNav';
import LandingWaitlist from '@/app/components/LandingWaitlist';
import ContactForm from '@/app/components/ContactForm';
import { FOOTER_LINKS } from '@/lib/landing-nav';
import { PRICING_FAQ } from '@/lib/pricing-tiers';
import { complexityLabel, formatTemplatePrice } from '@/lib/marketplace-templates';

interface FeaturedTemplate {
  id: string;
  name: string;
  description: string;
  price: number;
  complexity: number;
  category: string;
}

const VALUE_PROPS = [
  { icon: '⏰', title: 'Weeks → minutes', desc: 'Stop manual coding. Describe your app and ship the same day.' },
  { icon: '🤖', title: 'AI builds it', desc: 'Plain-English prompts become full apps with real, exportable code.' },
  { icon: '📦', title: 'You own it', desc: 'Download ZIP. Host anywhere. No platform lock-in.' },
  { icon: '💸', title: 'Agency margins', desc: 'Fraction of outsource cost — charge clients more, build faster.' },
  { icon: '🔒', title: 'No lock-in', desc: 'Unlike Bubble or Webflow, your code leaves with you forever.' },
  { icon: '💳', title: 'Fair pricing', desc: 'Start free. Scale to Agency when your client roster grows.' },
];

const HOW_IT_WORKS = [
  { number: '01', title: 'Describe your app', desc: 'Type what you need — or import a Google Business listing.' },
  { number: '02', title: 'AI generates code', desc: 'Preview live, edit visually, and refine with prompts.' },
  { number: '03', title: 'Export & deliver', desc: 'ZIP export, PWA, or live preview link for your client.' },
];

function PrimaryCta({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return (
      <Link href="/builder" className="btn-primary px-8 py-3 rounded-xl font-semibold">
        Open Builder →
      </Link>
    );
  }
  return (
    <Link href="/login" className="btn-primary px-8 py-3 rounded-xl font-semibold">
      Get Started Free
    </Link>
  );
}

export default function LandingPage() {
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [featuredTemplates, setFeaturedTemplates] = useState<FeaturedTemplate[]>([]);

  useEffect(() => {
    getSafeSession().then((session) => setIsLoggedIn(!!session?.user));
    fetch('/api/waitlist/count')
      .then((r) => r.json())
      .then((d) => setWaitlistCount(d.count || 0))
      .catch(() => {});
    fetch('/api/marketplace?featured=true&limit=6')
      .then((r) => r.json())
      .then((d) => setFeaturedTemplates(d.templates || []))
      .catch(() => {});
  }, []);

  const templates =
    featuredTemplates.length > 0
      ? featuredTemplates
      : [
          { id: '1', name: 'Portfolio Builder', description: 'Single-page creative portfolio', price: 0, complexity: 1, category: 'portfolio' },
          { id: '2', name: 'Waitlist Landing Page', description: 'Email capture landing page', price: 0, complexity: 2, category: 'marketing' },
          { id: '8', name: 'Ecommerce Dashboard', description: 'Products, orders & revenue charts', price: 25, complexity: 6, category: 'ecommerce' },
          { id: '15', name: 'Online Learning Platform', description: 'Full LMS with courses & quizzes', price: 49, complexity: 10, category: 'education' },
        ];

  return (
    <div className="min-h-screen bg-nisk text-[var(--foreground)]">
      <AppTopNav variant="marketing" />
      <LandingSectionNav />

      {/* Hero */}
      <section className="pt-12 pb-16 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-5 text-gradient-brand leading-tight">
            Build client apps in minutes.
            <br />
            Own them forever.
          </h1>
          <p className="text-lg text-nisk-muted mb-8 max-w-2xl mx-auto">
            The AI app builder that gives you the code — not just the platform. Export locally. Zero lock-in.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <PrimaryCta isLoggedIn={isLoggedIn} />
            <a href="#try-it-now" className="btn-secondary px-8 py-3 rounded-xl font-medium">
              Try Live Demo
            </a>
            <Link href="/marketplace" className="text-sm text-[var(--accent-cyan)] hover:underline font-medium px-2">
              Browse templates →
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm text-nisk-muted">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            {waitlistCount.toLocaleString()} builders on the waitlist
          </div>
        </div>
      </section>

      <TryItNowDemo />

      {/* Features — merged problem + solution */}
      <section id="features" className="py-16 px-4 scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Why NiskBuild</h2>
          <p className="text-nisk-muted text-center mb-10 max-w-2xl mx-auto">
            Everything freelancers and agencies need to win clients without outsourcing.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALUE_PROPS.map((item) => (
              <div
                key={item.title}
                className="glass-panel rounded-xl p-5 card-hover"
              >
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">{item.title}</h3>
                <p className="text-nisk-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4 bg-nisk-surface scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.number} className="glass-panel rounded-xl p-6 text-center">
                <div className="text-5xl font-bold text-[var(--primary)]/25 mb-3">{step.number}</div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-nisk-muted text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="py-16 px-4 scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Templates</h2>
          <p className="text-nisk-muted text-center mb-2 max-w-2xl mx-auto">
            2 free starters · Premium from $9 · Enterprise suites $49
          </p>
          <p className="text-center mb-10">
            <Link href="/marketplace" className="text-[var(--accent-cyan)] hover:underline text-sm font-medium">
              View all templates in Marketplace →
            </Link>
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="glass-panel rounded-xl p-5 card-hover flex flex-col"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-semibold">{template.name}</h3>
                  <span
                    className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${
                      template.price === 0
                        ? 'bg-[var(--success)]/15 text-[var(--success)]'
                        : 'bg-[var(--primary)]/15 text-[var(--primary)]'
                    }`}
                  >
                    {formatTemplatePrice(template.price)}
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-nisk-muted mb-2">
                  {complexityLabel(template.complexity as 1)} · {template.category}
                </span>
                <p className="text-nisk-muted text-sm flex-1">{template.description}</p>
                <Link
                  href={isLoggedIn ? '/marketplace' : '/login?next=/marketplace'}
                  className="mt-4 text-sm text-[var(--accent-cyan)] hover:underline font-medium"
                >
                  {template.price === 0 ? 'Use free →' : `View $${template.price} →`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4 bg-nisk-surface scroll-mt-28">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Pricing</h2>
          <p className="text-nisk-muted text-center mb-10 max-w-xl mx-auto">
            Start free. Scale to Agency Studio at $299/mo when your roster grows.
          </p>
          <PricingCards variant="landing" />
          <p className="text-center mt-8">
            <Link href="/pricing" className="text-[var(--primary)] hover:underline font-medium text-sm">
              Compare all plans →
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4 scroll-mt-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">FAQ</h2>
          <div className="space-y-2">
            {PRICING_FAQ.map((faq) => (
              <details key={faq.q} className="glass-panel rounded-xl group">
                <summary className="cursor-pointer p-4 font-medium hover:text-[var(--primary)] transition-colors list-none flex justify-between items-center gap-4">
                  {faq.q}
                  <span className="text-nisk-muted group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="px-4 pb-4 text-nisk-muted text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact — form only, no public email */}
      <section id="contact" className="py-16 px-4 bg-nisk-surface scroll-mt-28">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Contact us</h2>
          <p className="text-nisk-muted text-center mb-8 text-sm">
            All inquiries go through our team. Pro plans get a full ticket portal in the dashboard.
          </p>
          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <ContactForm variant="landing" />
          </div>
        </div>
      </section>

      {/* Final CTA + single waitlist */}
      <section className="py-16 px-4 bg-nisk-surface">
        <div className="max-w-3xl mx-auto text-center glass-panel rounded-2xl p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to build apps you own?</h2>
          <p className="text-nisk-muted mb-6">Start free — no credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <PrimaryCta isLoggedIn={isLoggedIn} />
            <a href="#try-it-now" className="btn-secondary px-6 py-3 rounded-xl text-sm">
              Try demo first
            </a>
          </div>
          <LandingWaitlist />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto text-center">
          <NiskBuildLogo variant="image" size="md" />
          <div className="flex justify-center flex-wrap gap-5 text-sm text-nisk-muted mt-5 mb-4">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-[var(--primary)] transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-nisk-muted text-xs">© 2026 NiskBuild. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
