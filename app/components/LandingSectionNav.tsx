'use client';

import { LANDING_SECTIONS } from '@/lib/landing-nav';

export default function LandingSectionNav() {
  return (
    <nav
      aria-label="Page sections"
      className="sticky top-14 z-40 py-3 px-4 border-b border-[var(--border)] glass-nav"
    >
      <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide">
        {LANDING_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium text-nisk-muted hover:text-white border border-[var(--border)] hover:border-[var(--accent-cyan)]/40 hover:bg-[var(--accent-cyan)]/10 transition-colors"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
