'use client';

import { useEffect, useState } from 'react';

const PROMPT =
  'A booking site for my dental clinic — calm, trustworthy, same-day appointments.';

const CODE_LINES = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <title>Northside Dental</title>',
  '  <script src="cdn.tailwindcss.com"></script>',
  '</head>',
  '<body class="bg-[var(--clinic-bg)]">',
  '  <nav>…Book today</nav>',
  '  <section class="hero">',
  '    <h1>Same-day care</h1>',
  '    <button>Book appointment</button>',
  '  </section>',
  '</body>',
  '</html>',
];

/**
 * Lightweight animated mockup: prompt → streaming code → preview.
 * Replace with a real product capture when available.
 */
export default function LandingV2HeroDemo() {
  const [promptChars, setPromptChars] = useState(0);
  const [codeLines, setCodeLines] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let promptTimer: ReturnType<typeof setTimeout>;
    let codeTimer: ReturnType<typeof setTimeout>;
    let previewTimer: ReturnType<typeof setTimeout>;
    let loopTimer: ReturnType<typeof setTimeout>;

    const run = () => {
      if (cancelled) return;
      setPromptChars(0);
      setCodeLines(0);
      setShowPreview(false);

      let p = 0;
      const typePrompt = () => {
        if (cancelled) return;
        p += 1;
        setPromptChars(p);
        if (p < PROMPT.length) {
          promptTimer = setTimeout(typePrompt, 28);
        } else {
          let line = 0;
          const streamCode = () => {
            if (cancelled) return;
            line += 1;
            setCodeLines(line);
            if (line < CODE_LINES.length) {
              codeTimer = setTimeout(streamCode, 90);
            } else {
              previewTimer = setTimeout(() => {
                if (!cancelled) setShowPreview(true);
              }, 350);
              loopTimer = setTimeout(run, 4200);
            }
          };
          codeTimer = setTimeout(streamCode, 400);
        }
      };
      promptTimer = setTimeout(typePrompt, 400);
    };

    run();
    return () => {
      cancelled = true;
      clearTimeout(promptTimer);
      clearTimeout(codeTimer);
      clearTimeout(previewTimer);
      clearTimeout(loopTimer);
    };
  }, []);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--iron-dark)] shadow-[0_24px_64px_-20px_var(--copper-glow)]"
      aria-hidden="true"
    >
      {/* Signature: molten copper edge along the top */}
      <div
        className="h-[3px] w-full"
        style={{ background: 'var(--build-gradient)' }}
      />
      <div className="grid md:grid-cols-2 min-h-[320px] md:min-h-[380px]">
        <div className="p-4 md:p-5 border-b md:border-b-0 md:border-r border-[var(--border)] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--copper-melt)] font-semibold">
              Prompt
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--copper-primary)] animate-pulse" />
          </div>
          <p className="font-mono text-sm md:text-[13px] leading-relaxed text-[var(--nisk-color)] flex-1">
            {PROMPT.slice(0, promptChars)}
            <span className="inline-block w-[2px] h-[1em] align-[-0.1em] ml-0.5 bg-[var(--copper-melt)] animate-pulse" />
          </p>
        </div>

        <div className="relative flex flex-col min-h-[200px]">
          <div
            className={`absolute inset-0 p-4 md:p-5 transition-opacity duration-500 ${
              showPreview ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] font-semibold">
                Code
              </span>
            </div>
            <pre className="font-mono text-[11px] md:text-xs leading-relaxed text-[var(--code-keyword)] overflow-hidden">
              {CODE_LINES.slice(0, codeLines).map((line, i) => (
                <div key={i} className="whitespace-pre">
                  <span className="text-[var(--code-comment)] select-none mr-2">
                    {String(i + 1).padStart(2, ' ')}
                  </span>
                  {line}
                </div>
              ))}
            </pre>
          </div>

          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              showPreview ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="h-full flex flex-col bg-[var(--surface)]">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border)]">
                <span className="w-2 h-2 rounded-full bg-[var(--muted)]/50" />
                <span className="w-2 h-2 rounded-full bg-[var(--muted)]/50" />
                <span className="w-2 h-2 rounded-full bg-[var(--muted)]/50" />
                <span className="ml-2 text-[10px] text-[var(--muted)] font-mono">
                  preview · northside-dental
                </span>
              </div>
              <div className="flex-1 p-4 md:p-6 bg-[#f4f7f6] text-[#1e2a28]">
                <div className="flex justify-between items-center mb-6 text-xs font-medium">
                  <span className="text-[#2d6a5a]">Northside Dental</span>
                  <span className="px-2.5 py-1 rounded-md bg-[#2d6a5a] text-white text-[10px]">
                    Book today
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold tracking-tight mb-2 text-[#152422]">
                  Same-day care, close to home
                </h3>
                <p className="text-xs md:text-sm text-[#4a5c58] max-w-[240px] leading-relaxed mb-4">
                  Book online in under a minute — evenings and weekends available.
                </p>
                <div className="h-16 rounded-lg bg-gradient-to-br from-[#d8ebe4] to-[#b8d4cb] border border-[#9bbfb2]/40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
