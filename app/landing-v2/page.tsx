'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSafeSession } from '@/lib/supabaseSession';
import AppTopNav from '@/app/components/AppTopNav';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import LandingV2HeroDemo from '@/app/components/LandingV2HeroDemo';
import { FOOTER_LINKS } from '@/lib/landing-nav';
import { PRICING_TIERS } from '@/lib/pricing-tiers';

const COMPARISON_ROWS = [
  {
    other: 'Your app lives on their servers',
    ours: 'Your app is yours — export it anytime',
  },
  {
    other: 'Cancel, and your work is gone',
    ours: 'Cancel, and you still have the code',
  },
  {
    other: '“Export” often means a locked preview',
    ours: 'Export means the real source, ready to deploy',
  },
] as const;

const HOW_STEPS = [
  {
    n: '1',
    title: 'Describe it',
    body: 'Tell NiskBuild what you want to build, in plain English. “A booking site for my dental clinic” is enough to start.',
  },
  {
    n: '2',
    title: 'Watch it get built',
    body: 'Real AI writes real code in front of you — HTML, CSS, and JavaScript streaming into a live preview as it’s generated.',
  },
  {
    n: '3',
    title: 'Make it yours',
    body: 'Add pages, tweak the design, iterate with more prompts. Every version is saved, so you can always go back.',
  },
  {
    n: '4',
    title: 'Take it with you',
    body: 'Export the full source code, deploy a live preview, or hand it to a developer to take further. It’s yours either way.',
  },
] as const;

const PROOF_CARDS = [
  {
    prompt: 'A booking site for my dental clinic',
    label: 'Clinical',
    // TODO: replace with real product screenshot of a dental clinic build
    gradient: 'linear-gradient(145deg, #e8f2ef 0%, #c5ddd4 45%, #2d6a5a 100%)',
    accent: '#2d6a5a',
  },
  {
    prompt: 'A vintage record shop with a warm, retro feel',
    label: 'Retail',
    // TODO: replace with real product screenshot of a vinyl shop build
    gradient: 'linear-gradient(145deg, #f5ebe0 0%, #c4a574 40%, #5c3a1e 100%)',
    accent: '#964B00',
  },
  {
    prompt: 'An analytics dashboard for a SaaS product',
    label: 'Product',
    // TODO: replace with real product screenshot of a SaaS analytics build
    gradient: 'linear-gradient(145deg, #1a1f2e 0%, #2F80ED 35%, #7A288A 100%)',
    accent: '#2F80ED',
  },
] as const;

const TEASER_TIER_KEYS = ['Sandbox', 'Basic', 'Pro Worker'] as const;

function StartCta({
  isLoggedIn,
  className = '',
  label = 'Start free — no card required',
}: {
  isLoggedIn: boolean;
  className?: string;
  label?: string;
}) {
  if (isLoggedIn) {
    return (
      <Link href="/builder" className={`btn-primary px-8 py-3 rounded-xl font-semibold ${className}`}>
        Open Builder →
      </Link>
    );
  }
  return (
    <Link href="/signup" className={`btn-primary px-8 py-3 rounded-xl font-semibold ${className}`}>
      {label}
    </Link>
  );
}

export default function LandingV2Page() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    getSafeSession().then((session) => setIsLoggedIn(!!session?.user));
  }, []);

  const teaserTiers = TEASER_TIER_KEYS.map((name) =>
    PRICING_TIERS.find((t) => t.name === name)
  ).filter((t): t is (typeof PRICING_TIERS)[number] => !!t);

  return (
    <div className="min-h-screen bg-nisk text-[var(--foreground)]">
      <AppTopNav variant="marketing" />

      {/* 1. HERO */}
      <section className="relative pt-16 md:pt-20 pb-20 px-4 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 70% 0%, var(--copper-glow), transparent 55%)',
          }}
        />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
            <div>
              <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.16em] text-[var(--copper-melt)] mb-4">
                Own your code. Not a subscription to your own idea.
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.12] mb-5 text-[var(--nisk-color)]">
                Describe your app.{' '}
                <span className="text-gradient-brand">Get real code.</span>{' '}
                Keep it forever.
              </h1>
              <p className="text-base md:text-lg text-nisk-muted leading-relaxed mb-8 max-w-xl">
                NiskBuild&apos;s AI writes working apps from a plain-English prompt — then hands you
                the actual source code. No lock-in, no black box, no &ldquo;export&rdquo; that
                doesn&apos;t really export.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <StartCta isLoggedIn={isLoggedIn} />
                <a
                  href="#how-it-works"
                  className="btn-secondary px-8 py-3 rounded-xl font-medium text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--copper-primary)]"
                >
                  See how it works
                </a>
              </div>
            </div>
            <LandingV2HeroDemo />
          </div>
        </div>
      </section>

      {/* 2. THE DIFFERENCE */}
      <section id="difference" className="py-20 px-4 bg-nisk-surface scroll-mt-28">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copper-melt)] mb-3">
            Why NiskBuild
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5 text-[var(--nisk-color)]">
            Most AI builders rent you an app. We hand you the keys.
          </h2>
          <p className="text-nisk-muted text-base md:text-lg leading-relaxed mb-10 max-w-3xl">
            Type a prompt into most AI app builders, and what you get back lives on their platform,
            under their terms. Stop paying, and it&apos;s gone. NiskBuild works differently. Every
            app you build comes with clean, exportable code — HTML, CSS, JavaScript you can open,
            edit, host anywhere, or hand to a developer. If you ever leave NiskBuild, your apps
            don&apos;t leave with us.
          </p>

          <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--card-bg)]">
            <div className="grid grid-cols-2 border-b border-[var(--border)]">
              <div className="px-4 md:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-nisk-muted">
                Other builders
              </div>
              <div className="px-4 md:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--copper-melt)] border-l border-[var(--border)] bg-[var(--copper-glow)]">
                NiskBuild
              </div>
            </div>
            {COMPARISON_ROWS.map((row) => (
              <div
                key={row.other}
                className="grid grid-cols-2 border-b border-[var(--border)] last:border-b-0"
              >
                <div className="px-4 md:px-6 py-4 text-sm text-nisk-muted leading-relaxed">
                  {row.other}
                </div>
                <div className="px-4 md:px-6 py-4 text-sm text-[var(--nisk-color)] leading-relaxed border-l border-[var(--border)] font-medium">
                  {row.ours}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[var(--nisk-color)] font-medium text-base md:text-lg">
            Build fast with AI. Leave whenever you want, with everything you made.
          </p>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-4 scroll-mt-28">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copper-melt)] mb-3">
            From idea to app
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-[var(--nisk-color)] max-w-2xl">
            Four steps. No code required — unless you want it.
          </h2>

          <ol className="space-y-0">
            {HOW_STEPS.map((step, i) => (
              <li
                key={step.n}
                className="grid md:grid-cols-[4rem_1fr] gap-4 md:gap-8 py-6 border-t border-[var(--border)] last:border-b"
              >
                <div className="flex md:flex-col items-baseline md:items-start gap-3 md:gap-1">
                  <span
                    className="text-3xl md:text-4xl font-bold tabular-nums leading-none"
                    style={{
                      background: 'var(--build-gradient)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {step.n}
                  </span>
                  {i < HOW_STEPS.length - 1 && (
                    <span className="hidden md:block w-px h-8 ml-3 bg-[var(--border)]" aria-hidden />
                  )}
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-2 text-[var(--nisk-color)]">
                    {step.title}
                  </h3>
                  <p className="text-nisk-muted text-sm md:text-base leading-relaxed max-w-2xl">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. PROOF */}
      <section id="proof" className="py-20 px-4 bg-nisk-surface scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copper-melt)] mb-3">
            See what it builds
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10 text-[var(--nisk-color)] max-w-2xl">
            Three prompts. Three completely different apps.
          </h2>

          <div className="grid md:grid-cols-3 gap-5">
            {PROOF_CARDS.map((card) => (
              <article
                key={card.prompt}
                className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--card-bg)] flex flex-col"
              >
                {/* TODO: swap gradient placeholder for real product screenshot */}
                <div
                  className="aspect-[4/3] relative"
                  style={{ background: card.gradient }}
                  role="img"
                  aria-label={`Placeholder preview for: ${card.prompt}`}
                >
                  <span className="absolute bottom-3 left-3 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded bg-black/35 text-white/90">
                    Screenshot placeholder · {card.label}
                  </span>
                </div>
                <div className="p-4 md:p-5 flex-1 flex flex-col">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2 font-semibold">
                    Prompt
                  </p>
                  <p
                    className="text-sm font-medium leading-snug"
                    style={{ color: 'var(--nisk-color)' }}
                  >
                    &ldquo;{card.prompt}&rdquo;
                  </p>
                  <div
                    className="mt-4 h-1 w-10 rounded-full"
                    style={{ backgroundColor: card.accent }}
                    aria-hidden
                  />
                </div>
              </article>
            ))}
          </div>

          <p className="mt-8 text-center text-nisk-muted text-sm md:text-base">
            No two NiskBuild apps look the same — because no two ideas are the same.
          </p>
        </div>
      </section>

      {/* 5. PLANS TEASER */}
      <section id="plans" className="py-20 px-4 scroll-mt-28">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copper-melt)] mb-3 text-center">
            Simple pricing
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-center text-[var(--nisk-color)]">
            Start free. Upgrade when you&apos;re ready.
          </h2>
          <p className="text-nisk-muted text-center mb-12 max-w-xl mx-auto text-sm md:text-base">
            Every plan includes the full builder. Higher tiers add exports, marketplace access, and
            room to grow.
          </p>

          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            {teaserTiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-5 md:p-6 flex flex-col ${
                  tier.highlighted
                    ? 'border-[var(--copper-primary)] bg-[var(--copper-glow)] shadow-[0_12px_40px_-16px_var(--copper-glow)]'
                    : 'border-[var(--border)] bg-[var(--card-bg)]'
                }`}
              >
                <h3 className="text-lg font-semibold text-[var(--nisk-color)] mb-1">{tier.name}</h3>
                <p className="text-nisk-muted text-xs mb-4">{tier.description}</p>
                <p className="mb-4">
                  <span className="text-3xl font-bold text-[var(--nisk-color)]">{tier.price}</span>
                  <span className="text-nisk-muted text-sm">{tier.period}</span>
                </p>
                <ul className="space-y-2 text-sm text-nisk-muted flex-1 mb-5">
                  {tier.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex gap-2 leading-snug">
                      <span className="text-[var(--copper-melt)] shrink-0" aria-hidden>
                        ·
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.tier ? `/pricing` : isLoggedIn ? '/builder' : '/signup'}
                  className={`text-center text-sm font-semibold py-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--copper-primary)] ${
                    tier.highlighted
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                >
                  {tier.buttonText}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center mt-8">
            <Link
              href="/pricing"
              className="text-[var(--copper-melt)] hover:text-[var(--copper-light)] font-medium text-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--copper-primary)] rounded"
            >
              See the full plan comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-20 px-4 bg-nisk-surface">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="h-[3px] w-16 mx-auto mb-8 rounded-full"
            style={{ background: 'var(--build-gradient)' }}
            aria-hidden
          />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[var(--nisk-color)]">
            Build your first app in the next five minutes.
          </h2>
          <p className="text-nisk-muted text-base md:text-lg mb-8 leading-relaxed">
            No credit card. No commitment. Just describe what you want, and see what NiskBuild
            builds.
          </p>
          <StartCta isLoggedIn={isLoggedIn} label="Start free" />
          <p className="mt-5 text-xs md:text-sm text-nisk-muted">
            Your code is always yours — even if you stop using NiskBuild.
          </p>
        </div>
      </section>

      <footer className="py-10 px-4 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto text-center">
          <NiskBuildLogo variant="lockup" size="lg" href="/landing-v2" />
          <div className="flex justify-center flex-wrap gap-5 text-sm text-nisk-muted mt-5 mb-4">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[var(--primary)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--copper-primary)] rounded"
              >
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
