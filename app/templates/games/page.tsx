"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/app/components/Layout';
import { GAME_TEMPLATES } from '@/lib/game-templates';
import { canUseGameTemplates } from '@/lib/tier-config';

export default function GameTemplatesPage() {
  const [tier, setTier] = useState('free');
  const [status, setStatus] = useState('inactive');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscription/status', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.tier) {
          setTier(d.tier);
          setStatus(d.status ?? 'inactive');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const canUse = canUseGameTemplates(tier, status);

  if (loading) {
    return (
      <Layout variant="app" showFooter={false}>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!canUse) {
    return (
      <Layout variant="app" showFooter={false}>
        <div className="max-w-lg mx-auto py-20 px-4 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-bold text-white mb-3">Game Templates</h1>
          <p className="text-nisk-muted mb-8">
            Pre-built Phaser.js game templates are available on Agency plan and above.
          </p>
          <Link href="/pricing" className="btn-primary inline-flex px-6 py-3 rounded-xl text-sm font-medium">
            Upgrade to Agency →
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="app" showFooter={false}>
      <div className="max-w-6xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-white mb-2">🎮 Game Templates</h1>
        <p className="text-nisk-muted mb-8 max-w-2xl">
          Start from a working Phaser.js template or describe your own game in the Builder.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {GAME_TEMPLATES.map((game) => (
            <div
              key={game.id}
              className="rounded-2xl border border-nisk bg-nisk-card p-6 hover:border-[var(--primary)]/40 transition-all"
            >
              <div className="text-5xl mb-4">{game.icon}</div>
              <h2 className="text-lg font-semibold text-white">{game.name}</h2>
              <p className="text-sm text-nisk-muted mt-2">{game.description}</p>
              <p className="text-[10px] text-nisk-muted mt-3">Difficulty: {game.difficulty}</p>
              <Link
                href={`/builder?game=${game.id}`}
                className="inline-block mt-4 px-4 py-2 rounded-lg btn-primary text-sm font-medium"
              >
                Use template →
              </Link>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--secondary)]/30 bg-[var(--secondary)]/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-white mb-2">Create your own game</h2>
          <p className="text-sm text-nisk-muted mb-4">
            Describe any game idea in plain English — NiskBuild generates working Phaser.js code.
          </p>
          <Link href="/builder" className="btn-secondary inline-flex px-5 py-2.5 rounded-xl text-sm">
            Open Builder →
          </Link>
        </div>
      </div>
    </Layout>
  );
}
