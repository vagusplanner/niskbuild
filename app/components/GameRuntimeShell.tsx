"use client";

import { useCallback, useRef, useState } from 'react';

type GameRuntimeShellProps = {
  title: string;
  html: string | null;
  bundleUrl: string | null;
};

export function GameRuntimeShell({ title, html, bundleUrl }: GameRuntimeShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameKey, setFrameKey] = useState(0);

  const restart = useCallback(() => {
    setFrameKey((k) => k + 1);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const hasContent = !!(html || bundleUrl);

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col">
      <header className="shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[#64748B]">NiskBuild Game</p>
          <h1 className="text-white font-semibold truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={restart}
            disabled={!hasContent}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#4F6EF7] text-white hover:bg-[#3B5BD9] disabled:opacity-40 transition-colors"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            disabled={!hasContent}
            className="px-3 py-1.5 text-sm rounded-lg border border-white/20 text-[#E2E8F0] hover:bg-white/5 disabled:opacity-40 transition-colors"
          >
            Fullscreen
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div
          ref={containerRef}
          className="w-full max-w-5xl aspect-video rounded-2xl border border-white/10 bg-black shadow-2xl overflow-hidden"
        >
          {html ? (
            <iframe
              key={frameKey}
              srcDoc={html}
              title={title}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            />
          ) : bundleUrl ? (
            <iframe
              key={frameKey}
              src={bundleUrl}
              title={title}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] text-sm px-6 text-center gap-2">
              <span className="text-4xl">🎮</span>
              <p>Game runtime ready — publish your build to activate this domain.</p>
            </div>
          )}
        </div>
      </div>

      <footer className="shrink-0 py-3 text-center text-[10px] text-[#64748B]">
        Powered by NiskBuild · Phaser.js
      </footer>
    </div>
  );
}
