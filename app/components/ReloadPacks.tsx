"use client";

import { useState } from 'react';
import { RELOAD_PACKS, PACK_ID_TO_BOOST } from '@/lib/reload-packs';

export default function ReloadPacks() {
  const [loading, setLoading] = useState<string | null>(null);

  const buyPack = async (packId: string) => {
    setLoading(packId);
    try {
      const boostType = PACK_ID_TO_BOOST[packId];
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isReload: true, boostType, packId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Checkout failed');
    } catch {
      alert('Checkout failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold text-white text-center mb-2">Credit reload packs</h2>
      <p className="text-nisk-muted text-center text-sm mb-8 max-w-xl mx-auto">
        Top up anytime. Priced higher per-credit than your plan — upgrading to Agency Studio is still the best value.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {RELOAD_PACKS.map((pack) => (
          <div
            key={pack.id}
            className="bg-nisk-card border border-nisk rounded-xl p-5 flex flex-col hover:border-[var(--accent-cyan)]/50 transition-all"
          >
            <h3 className="font-semibold text-white">{pack.name}</h3>
            <p className="text-2xl font-bold text-white mt-2">
              ${pack.priceUsd}
              <span className="text-xs text-nisk-muted font-normal ml-1">
                / {pack.credits} credits
              </span>
            </p>
            <p className="text-xs text-nisk-muted mt-2 flex-1">
              {pack.pricePerCredit}/credit — {pack.description}
            </p>
            <button
              type="button"
              onClick={() => buyPack(pack.id)}
              disabled={loading === pack.id}
              className="btn-secondary mt-4 w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading === pack.id ? 'Redirecting...' : 'Buy pack'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
