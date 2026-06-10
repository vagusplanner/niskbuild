"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
  storageKey?: string;
}

export default function ResizableSplit({
  left,
  right,
  defaultLeftPercent = 34,
  minLeftPercent = 18,
  maxLeftPercent = 55,
  storageKey = 'niskbuild_split_pct',
}: ResizableSplitProps) {
  const [leftPct, setLeftPct] = useState(defaultLeftPercent);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const n = Number(saved);
      if (!Number.isNaN(n) && n >= minLeftPercent && n <= maxLeftPercent) {
        setLeftPct(n);
      }
    }
  }, [storageKey, minLeftPercent, maxLeftPercent]);

  const onMove = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(maxLeftPercent, Math.max(minLeftPercent, pct));
      setLeftPct(clamped);
      localStorage.setItem(storageKey, String(Math.round(clamped)));
    },
    [minLeftPercent, maxLeftPercent, storageKey]
  );

  useEffect(() => {
    const up = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    const move = (e: MouseEvent) => {
      if (dragging.current) onMove(e.clientX);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [onMove]);

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 w-full">
      <div className="min-w-0 flex flex-col" style={{ width: `${leftPct}%` }}>
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        onMouseDown={() => {
          dragging.current = true;
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
        }}
        className="w-1.5 shrink-0 cursor-col-resize bg-nisk hover:bg-[var(--accent-cyan)]/40 active:bg-[var(--accent-cyan)]/60 transition-colors relative group"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[var(--border)] group-hover:bg-[var(--accent-cyan)]" />
      </div>
      <div className="min-w-0 flex flex-col flex-1">{right}</div>
    </div>
  );
}
