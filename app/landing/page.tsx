"use client";

import { useState, useEffect } from 'react';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch waitlist count
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
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-[#4F6EF7] to-[#7C3AED] bg-clip-text text-transparent">
                NiskBuild
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-[#4F6EF7] transition-colors">Features</a>
              <a href="#templates" className="text-gray-300 hover:text-[#4F6EF7] transition-colors">Templates</a>
              <a href="#pricing" className="text-gray-300 hover:text-[#4F6EF7] transition-colors">Pricing</a>
              <a href="/login" className="px-4 py-2 rounded-lg bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white font-medium transition-all">
                Sign In
              </a>
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
          <div className="md:hidden bg-[#0A0A0F] border-b border-gray-800">
            <div className="px-4 py-3 space-y-3">
              <a href="#features" className="block text-gray-300 hover:text-[#4F6EF7]">Features</a>
              <a href="#templates" className="block text-gray-300 hover:text-[#4F6EF7]">Templates</a>
              <a href="#pricing" className="block text-gray-300 hover:text-[#4F6EF7]">Pricing</a>
              <a href="/login" className="block text-[#4F6EF7]">Sign In</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #4F6EF7 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-[#4F6EF7] to-[#7C3AED] bg-clip-text text-transparent">
            Build Client Apps in Minutes.
            <br />
            Own Them Forever.
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            The AI app builder that gives you the code, not just the platform. 
            Export locally. Zero lock-in. Complete ownership.
          </p>
          
          {/* Waitlist Form */}
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-[#111118] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#4F6EF7] transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white font-medium transition-all disabled:opacity-50"
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
      <section id="features" className="py-20 px-4 bg-[#0A0A0F]">
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
              <div key={i} className="bg-[#111118] rounded-xl p-6 border border-gray-800 hover:border-[#4F6EF7]/50 transition-all hover:shadow-lg hover:shadow-[#4F6EF7]/10">
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
              <div key={i} className="bg-[#111118] rounded-xl p-6 border border-gray-800 text-center hover:border-[#7C3AED]/50 transition-all group">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" className="py-20 px-4 bg-[#0A0A0F]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            6 ready-made templates to start instantly
          </h2>
          <p className="text-gray-400 text-center mb-12">Launch your next client project in minutes, not weeks</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Client Portal', desc: 'Secure access to project updates and files', badge: 'Free' },
              { name: 'Booking System', desc: 'Appointment scheduling with calendar sync', badge: 'Free' },
              { name: 'E-commerce Store', desc: 'Product listings, cart, and checkout', badge: 'Pro' },
              { name: 'Restaurant App', desc: 'Menu, reservations, and online ordering', badge: 'Pro' },
              { name: 'Coaching Platform', desc: 'Course delivery and client management', badge: 'Pro' },
              { name: 'CRM for Small Business', desc: 'Contact management and deal pipeline', badge: 'Agency' }
            ].map((template, i) => (
              <div key={i} className="bg-[#111118] rounded-xl border border-gray-800 p-5 hover:border-[#4F6EF7]/50 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    template.badge === 'Free' ? 'bg-emerald-500/20 text-emerald-400' :
                    template.badge === 'Pro' ? 'bg-[#4F6EF7]/20 text-[#4F6EF7]' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {template.badge}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{template.desc}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Coming Soon</span>
                  <div className="w-6 h-6 rounded-full border border-gray-700"></div>
                </div>
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
                <div className="text-6xl font-bold text-[#4F6EF7]/20 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-[#0A0A0F]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-400 text-center mb-12">Choose the plan that works for you</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
              <h3 className="text-xl font-bold text-white mb-2">Free</h3>
              <p className="text-gray-400 text-sm mb-4">Perfect for getting started</p>
              <p className="text-3xl font-bold text-white mb-6">$0<span className="text-sm text-gray-400">/month</span></p>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="text-gray-300">✅ 2 projects</li>
                <li className="text-gray-300">✅ 3 templates</li>
                <li className="text-gray-300">✅ Basic AI</li>
                <li className="text-gray-400">❌ Unlimited projects</li>
                <li className="text-gray-400">❌ Clean export</li>
              </ul>
              <button className="w-full py-2 rounded-lg bg-gray-800 text-white cursor-default">Current Plan</button>
            </div>
            
            {/* Pro - Most Popular */}
            <div className="bg-gradient-to-b from-[#4F6EF7]/10 to-[#111118] rounded-xl border border-[#4F6EF7]/50 p-6 relative">
              <div className="absolute top-0 right-0 bg-[#4F6EF7] text-white text-xs px-3 py-1 rounded-bl-xl rounded-tr-xl">MOST POPULAR</div>
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-gray-400 text-sm mb-4">For professional freelancers</p>
              <p className="text-3xl font-bold text-white mb-6">$19<span className="text-sm text-gray-400">/month</span></p>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="text-gray-300">✅ Unlimited projects</li>
                <li className="text-gray-300">✅ All 6 templates</li>
                <li className="text-gray-300">✅ Clean local export</li>
                <li className="text-gray-300">✅ AI memory</li>
                <li className="text-gray-300">✅ Priority support</li>
              </ul>
              <button className="w-full py-2 rounded-lg bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white font-medium transition-colors">
                Upgrade to Pro
              </button>
            </div>
            
            {/* Agency */}
            <div className="bg-[#111118] rounded-xl border border-gray-800 p-6">
              <h3 className="text-xl font-bold text-white mb-2">Agency</h3>
              <p className="text-gray-400 text-sm mb-4">For agencies and teams</p>
              <p className="text-3xl font-bold text-white mb-6">$49<span className="text-sm text-gray-400">/month</span></p>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="text-gray-300">✅ Everything in Pro</li>
                <li className="text-gray-300">✅ White-label</li>
                <li className="text-gray-300">✅ Client workspaces</li>
                <li className="text-gray-300">✅ Priority AI queue</li>
              </ul>
              <button className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors">
                Upgrade to Agency
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Frequently asked questions</h2>
          
          <div className="space-y-4">
            {[
              { q: 'Do I own my code?', a: 'Yes, completely. When you export your project, you get the full source code with no watermarks, no lock-in, and no hidden fees.' },
              { q: 'What AI powers it?', a: 'NiskBuild uses open-source Llama models via Groq for fast, private, and cost-effective generation.' },
              { q: 'Can I cancel anytime?', a: 'Yes, absolutely. No contracts, no hidden fees. Cancel with one click.' },
              { q: 'Does it work on mobile?', a: 'Yes, the platform is fully responsive and works on desktop, tablet, and mobile devices.' },
              { q: 'Is my data private?', a: 'Yes, we never sell your data. Your code stays on your machine. Anonymous telemetry helps us improve the platform.' }
            ].map((faq, i) => (
              <details key={i} className="bg-[#111118] rounded-lg border border-gray-800">
                <summary className="cursor-pointer p-4 font-medium text-white hover:text-[#4F6EF7] transition-colors">
                  {faq.q}
                </summary>
                <p className="px-4 pb-4 text-gray-400">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#0A0A0F] to-[#111118]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop renting your apps. Start owning them.</h2>
          <p className="text-gray-400 mb-8">Join thousands of freelancers building apps they truly own.</p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg bg-[#111118] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#4F6EF7]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white font-medium transition-all disabled:opacity-50"
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
      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-4">
            <span className="text-2xl font-bold bg-gradient-to-r from-[#4F6EF7] to-[#7C3AED] bg-clip-text text-transparent">
              NiskBuild
            </span>
            <p className="text-gray-500 text-sm mt-2">Build anything. Own everything.</p>
          </div>
          <div className="flex justify-center space-x-6 text-sm text-gray-400 mb-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
          <p className="text-gray-500 text-xs">© 2026 NiskBuild. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}