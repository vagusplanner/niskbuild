"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSafeSession } from '@/lib/supabaseSession';
import PricingCards from '@/app/components/PricingCards';
import { PRICING_FAQ } from '@/lib/pricing-tiers';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    getSafeSession().then((session) => {
      setIsLoggedIn(!!session?.user);
    });
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/waitlist/count');
        const data = await response.json();
        setWaitlistCount(data.count || 0);
      } catch (err) {
        console.error('Failed to fetch waitlist count');
      }
    };
    fetchCount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        setEmail('');
        setWaitlistCount(data.count || waitlistCount + 1);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nisk text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-nisk/95 backdrop-blur-sm border-b border-nisk">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <a href="/landing" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NB</span>
              </div>
              <span className="text-xl font-bold text-white">NiskBuild</span>
            </a>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-300 hover:text-[var(--primary)] transition-colors">Features</a>
              <a href="#templates" className="text-gray-300 hover:text-[var(--primary)] transition-colors">Templates</a>
              <a href="/pricing" className="text-gray-300 hover:text-[var(--primary)] transition-colors">Pricing</a>
              {isLoggedIn ? (
                <Link href="/builder" className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium transition-all">
                  Open Builder
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-gray-300 hover:text-white transition-colors">Sign In</Link>
                  <Link href="/login" className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium transition-all">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-300 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-nisk border-b border-nisk">
            <div className="px-4 py-3 space-y-3">
              <a href="#features" className="block text-gray-300 hover:text-[var(--primary)]">Features</a>
              <a href="#templates" className="block text-gray-300 hover:text-[var(--primary)]">Templates</a>
              <a href="/pricing" className="block text-gray-300 hover:text-[var(--primary)]">Pricing</a>
              {isLoggedIn ? (
                <Link href="/builder" className="block text-[var(--primary)] font-medium">Open Builder</Link>
              ) : (
                <>
                  <Link href="/login" className="block text-gray-300">Sign In</Link>
                  <Link href="/login" className="block text-[var(--primary)] font-medium">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
            Build Client Apps in Minutes.
            <br />
            Own Them Forever.
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            The AI app builder that gives you the code, not just the platform. 
            Export locally. Zero lock-in. Complete ownership.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            {isLoggedIn ? (
              <Link
                href="/builder"
                className="px-8 py-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold transition-all"
              >
                Open Builder →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-8 py-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold transition-all"
                >
                  Get Started — Sign Up
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-3 rounded-lg border border-[var(--border)] text-white hover:border-[var(--primary)] font-medium transition-all"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
          
          {/* Waitlist Form */}
          <div className="max-w-md mx-auto">
            <p className="text-nisk-muted text-sm mb-3">Or join the waitlist for early access updates</p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-nisk-card border border-nisk text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium transition-all disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
            
            {success && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-sm">
                ✅ You're on the waitlist! We'll notify you when we launch.
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
                ❌ {error}
              </div>
            )}
            
            {/* Live Counter */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-gray-400 text-sm">
                {waitlistCount.toLocaleString()} builders already on the waitlist
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="features" className="py-20 px-4 bg-nisk">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Why freelancers are losing clients to agencies
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Traditional app development is broken. Here's the reality:
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '⏰', title: 'Takes weeks to build', desc: 'Manual coding drags timelines and kills margins' },
              { icon: '💰', title: 'Costs thousands to outsource', desc: 'Agencies charge premium rates you can\'t afford' },
              { icon: '🔒', title: 'Locked into expensive platforms', desc: 'Bubble, Webflow, Lovable hold your code hostage' }
            ].map((item, i) => (
              <div key={i} className="bg-nisk-card rounded-xl p-6 border border-nisk hover:border-[var(--primary)]/50 transition-all card-hover">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            NiskBuild changes everything
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            The first AI app builder designed for real ownership
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🤖', title: 'AI Builds It', desc: 'Describe your app in plain English. AI generates it in minutes.' },
              { icon: '📦', title: 'You Own It', desc: 'Export your project locally as ZIP. No lock-in. Ever.' },
              { icon: '💸', title: 'Pay Less', desc: 'Fraction of competitor cost. Cancel anytime.' }
            ].map((item, i) => (
              <div key={i} className="bg-nisk-card rounded-xl p-6 border border-nisk text-center hover:border-[var(--secondary)]/50 transition-all card-hover group">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" className="py-20 px-4 bg-nisk">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            6 ready-made templates to start instantly
          </h2>
          <p className="text-nisk-muted text-center mb-4">Launch your next client project in minutes, not weeks</p>
          <p className="text-center mb-12">
            <Link href="/marketplace" className="text-[var(--primary)] hover:underline text-sm font-medium">
              Browse all templates in Marketplace →
            </Link>
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Client Portal', desc: 'Secure access to project updates and files', badge: 'Free' },
              { name: 'Booking System', desc: 'Appointment scheduling with calendar sync', badge: 'Free' },
              { name: 'E-commerce Store', desc: 'Product listings, cart, and checkout', badge: 'Pro' },
              { name: 'Restaurant App', desc: 'Menu, reservations, and online ordering', badge: 'Pro' },
              { name: 'Coaching Platform', desc: 'Course delivery and client management', badge: 'Pro' },
              { name: 'CRM for Small Business', desc: 'Contact management and deal pipeline', badge: 'Agency' }
            ].map((template, i) => (
              <div key={i} className="bg-nisk-card rounded-xl border border-nisk p-5 hover:border-[var(--primary)]/50 transition-all card-hover flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    template.badge === 'Free' ? 'bg-emerald-500/20 text-emerald-400' :
                    template.badge === 'Pro' ? 'bg-[var(--primary)]/20 text-[var(--primary)]' :
                    'bg-[var(--secondary)]/20 text-[var(--secondary)]'
                  }`}>
                    {template.badge}
                  </span>
                </div>
                <p className="text-nisk-muted text-sm flex-1">{template.desc}</p>
                <Link
                  href={isLoggedIn ? '/marketplace' : '/login?next=/marketplace'}
                  className="mt-4 text-sm text-[var(--primary)] hover:underline font-medium"
                >
                  Use in Builder →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How it works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { number: '01', title: 'Describe your app', desc: 'Tell the AI what you want to build in plain English' },
              { number: '02', title: 'AI builds it instantly', desc: 'Get complete, working code in seconds' },
              { number: '03', title: 'Export and own it forever', desc: 'Download your code. Host anywhere. Zero lock-in.' }
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="text-6xl font-bold text-[var(--primary)]/20 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-nisk-surface">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-nisk-muted text-center mb-12 max-w-xl mx-auto">
            Start free at $0. Scale to Agency Studio at $199/mo when your client roster grows.
          </p>

          <PricingCards variant="landing" />

          <p className="text-center mt-10">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-[var(--primary)] hover:underline font-medium"
            >
              Compare all plans &amp; upgrade →
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Frequently asked questions</h2>
          
          <div className="space-y-3">
            {PRICING_FAQ.map((faq) => (
              <details key={faq.q} className="bg-nisk-card rounded-xl border border-nisk group">
                <summary className="cursor-pointer p-4 font-medium text-white hover:text-[var(--primary)] transition-colors list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-nisk-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-4 pb-4 text-nisk-muted text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-[var(--background)] to-[var(--card-bg)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop renting your apps. Start owning them.</h2>
          <p className="text-gray-400 mb-8">Join thousands of freelancers building apps they truly own.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            {isLoggedIn ? (
              <Link href="/builder" className="px-8 py-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold">
                Open Builder →
              </Link>
            ) : (
              <Link href="/login" className="px-8 py-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold">
                Get Started Free →
              </Link>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg bg-nisk-card border border-nisk text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-medium transition-all disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Waitlist'}
            </button>
          </form>
          
          {success && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-sm">
              ✅ You're on the waitlist!
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-nisk">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-4">
            <span className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
              NiskBuild
            </span>
            <p className="text-nisk-muted text-sm mt-2">Build anything. Own everything.</p>
          </div>
          <div className="flex justify-center flex-wrap gap-6 text-sm text-nisk-muted mb-4">
            <Link href="/pricing" className="hover:text-[var(--primary)] transition-colors">Pricing</Link>
            <Link href="/marketplace" className="hover:text-[var(--primary)] transition-colors">Marketplace</Link>
            <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--primary)] transition-colors">Terms of Service</Link>
          </div>
          <p className="text-nisk-muted text-xs">© 2026 NiskBuild. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}