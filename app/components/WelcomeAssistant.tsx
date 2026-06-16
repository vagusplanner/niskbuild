"use client";

import { useState } from 'react';
import Link from 'next/link';

interface WelcomeAssistantProps {
  open: boolean;
  onComplete: () => void;
  userName?: string;
}

const STEPS = [
  {
    title: 'Welcome to NiskBuild',
    icon: '👋',
    body: 'You\'re in the builder — the heart of NiskBuild. Here you describe an app in plain English and AI generates working code you fully own.',
    tip: 'Everything runs in your browser. Export locally anytime.',
  },
  {
    title: 'How the builder works',
    icon: '🔨',
    body: 'The screen is split in two: on the left you write your prompt and see generated code. On the right, a live preview updates instantly so you can see exactly what your client will get.',
    tip: 'Use ⌘ + Enter to generate quickly from the prompt box.',
  },
  {
    title: 'Prompt → Code → Preview',
    icon: '⚡',
    body: '1. Type what you want in "Prompt to Build" (bottom left).\n2. Hit Generate — AI writes HTML, CSS, and JS.\n3. Code appears top-left; preview renders on the right.',
    tip: 'Be specific: "A booking page for a yoga studio with calendar and contact form."',
  },
  {
    title: 'Marketplace templates',
    icon: '🏪',
    body: 'Not sure where to start? Open Marketplace from the top-left menu. Browse community templates — CRM, e-commerce, booking systems — and click "Use Template" to load a ready-made prompt into the builder.',
    tip: 'Templates save hours on client projects.',
  },
  {
    title: 'Navigate anywhere',
    icon: '🧭',
    body: 'Click the NB logo (top-left) to open the menu. Jump between Builder, Marketplace, Pricing, and Landing. Your projects stay in the builder when you return.',
    tip: 'Admin tools appear in the menu if you have access.',
  },
  {
    title: 'Plans & export',
    icon: '💳',
    body: 'Free tier lets you build and preview. Upgrade on Pricing for more projects, cloud AI credits, clean ZIP export, and deploy features. You always own your code — no platform lock-in.',
    tip: 'Visit Pricing anytime from the menu.',
  },
  {
    title: 'Ready to build?',
    icon: '🚀',
    body: 'Describe your first app below and hit Generate. Need inspiration? Try the Marketplace or ask yourself: "What would save my client the most time?"',
    tip: null,
  },
];

export default function WelcomeAssistant({ open, onComplete, userName }: WelcomeAssistantProps) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      setStep(0);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
    setStep(0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm" onClick={handleSkip} />

      <div className="relative w-full max-w-lg bg-nisk-card border border-nisk rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-[var(--border)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{current.icon}</span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-nisk-muted">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  {step === 0 && userName ? `Welcome, ${userName}!` : current.title}
                </h2>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-nisk-muted hover:text-[var(--foreground)] text-sm transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line mb-4">
            {current.body}
          </p>

          {current.tip && (
            <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-[var(--primary)] font-medium">💡 {current.tip}</p>
            </div>
          )}

          {isLast && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Link
                href="/marketplace"
                onClick={onComplete}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--surface-elevated)] border border-nisk text-gray-300 hover:border-[var(--primary)] transition-colors"
              >
                Browse Marketplace
              </Link>
              <Link
                href="/pricing"
                onClick={onComplete}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--surface-elevated)] border border-nisk text-gray-300 hover:border-[var(--primary)] transition-colors"
              >
                View Pricing
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === step ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 text-sm text-nisk-muted hover:text-[var(--foreground)] transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-nisk-muted hover:text-[var(--foreground)] transition-colors"
              >
                Skip tour
              </button>
              <button
                onClick={handleNext}
                className="px-5 py-2 text-sm bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium transition-colors"
              >
                {isLast ? 'Start Building →' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
