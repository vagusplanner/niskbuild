"use client";

import { useState } from 'react';
import Link from 'next/link';

const DEFAULT_PROMPT =
  'Build me a booking app for a hair salon with appointment scheduling and Stripe payments.';

const EXAMPLE_PROMPTS = [
  'Build a restaurant website',
  'Create a task management SaaS',
  'Build a 2D platformer game',
];

export type DemoBlueprintResult = {
  appName: string;
  features: string[];
  suggestedTemplates: string[];
  estimatedBuildSeconds: number;
};

function storePromptForSignup(prompt: string) {
  try {
    localStorage.setItem('niskbuild_template_prompt', prompt);
  } catch {
    // ignore storage errors
  }
}

export default function TryItNowDemo() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DemoBlueprintResult | null>(null);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Describe what you want to build first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/demo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Preview generation failed. Try again in a moment.');
        return;
      }

      setResult(data.blueprint);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="try-it-now" className="py-16 px-4 relative scroll-mt-28">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-[var(--accent-cyan)] text-sm font-medium mb-2 uppercase tracking-wider">
            Try it now
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            See what NiskBuild would create
          </h2>
          <p className="text-nisk-muted max-w-xl mx-auto">
            No signup required. Instant AI blueprint — app structure, features, and templates.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-xl">
          <label htmlFor="demo-prompt" className="block text-sm font-medium mb-2">
            Describe your app
          </label>
          <textarea
            id="demo-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl glass-input text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--accent-cyan)]/50 transition-colors resize-none text-sm"
            placeholder="Describe the app you want to build..."
            disabled={loading}
          />

          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setPrompt(example);
                  setError('');
                  setResult(null);
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-xs glass-panel text-nisk-muted hover:text-[var(--foreground)] hover:border-[var(--accent-cyan)]/40 transition-colors disabled:opacity-40"
              >
                {example}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading || !prompt.trim()}
            className="mt-5 w-full sm:w-auto btn-primary px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating preview…
              </>
            ) : (
              'Generate Preview'
            )}
          </button>

          {error && (
            <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
        </div>

        {result && (
          <div className="mt-6 glass-panel rounded-2xl p-6 md:p-8 border-[var(--accent-cyan)]/25">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--accent-cyan)] mb-1">
                  Blueprint preview
                </p>
                <h3 className="text-2xl font-bold">{result.appName}</h3>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-nisk-muted uppercase tracking-wider">Est. build time</p>
                <p className="text-lg font-mono text-[var(--accent-cyan)]">
                  {result.estimatedBuildSeconds}s
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 mb-6">
              {result.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-nisk-muted">
                  <span className="text-[var(--success)] shrink-0 mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {result.suggestedTemplates.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-wider text-nisk-muted mb-2">
                  Suggested templates
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedTemplates.map((template) => (
                    <span
                      key={template}
                      className="px-2.5 py-1 rounded-lg text-xs border border-nisk bg-nisk-surface text-nisk-muted"
                    >
                      {template}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/login"
              onClick={() => storePromptForSignup(prompt)}
              className="btn-primary px-6 py-3 rounded-xl font-semibold text-center w-full sm:w-auto"
            >
              Get Started Free — Build This App
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
