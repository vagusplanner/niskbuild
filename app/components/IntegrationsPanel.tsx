"use client";

import { useEffect, useState } from 'react';
import { INTEGRATIONS, STRIPE_INJECT_CREDIT_COST } from '@/lib/integrations-config';
import {
  canNotifyComingSoonIntegrations,
  canUseStripeInject,
  canViewStripeRevenue,
} from '@/lib/tier-config';
import StripeRevenueWidget from '@/app/components/StripeRevenueWidget';

type IntegrationsPanelProps = {
  projectId: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  currentCode: string;
  onIntegrationAdded: (code: string, message: string, creditsRemaining?: number) => void;
  onStatusMessage?: (message: string) => void;
};

type StripeConfig = {
  paymentType: 'one-time' | 'subscription';
  productName: string;
  price: string;
  currency: string;
  publishableKey: string;
  stripeSecretKey: string;
};

const DEFAULT_STRIPE: StripeConfig = {
  paymentType: 'one-time',
  productName: '',
  price: '',
  currency: 'GBP',
  publishableKey: '',
  stripeSecretKey: '',
};

export default function IntegrationsPanel({
  projectId,
  subscriptionTier,
  subscriptionStatus,
  currentCode,
  onIntegrationAdded,
  onStatusMessage,
}: IntegrationsPanelProps) {
  const [activeIntegrations, setActiveIntegrations] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig>(DEFAULT_STRIPE);
  const [panelMessage, setPanelMessage] = useState('');

  const canStripe = canUseStripeInject(subscriptionTier, subscriptionStatus);
  const canNotify = canNotifyComingSoonIntegrations(subscriptionTier, subscriptionStatus);
  const canRevenue = canViewStripeRevenue(subscriptionTier, subscriptionStatus);
  const stripeActive = activeIntegrations.includes('stripe');

  useEffect(() => {
    if (!projectId) {
      setActiveIntegrations([]);
      return;
    }
    fetch(`/api/integrations?projectId=${projectId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { integrations: [] }))
      .then((data) => {
        setActiveIntegrations(
          (data.integrations || []).map((i: { integration_name: string }) => i.integration_name)
        );
      })
      .catch(() => setActiveIntegrations([]));
  }, [projectId]);

  const handleAddStripe = async () => {
    if (!projectId) {
      setPanelMessage('Save your project first, then add Stripe.');
      return;
    }

    setLoading('stripe');
    setPanelMessage('');

    try {
      const res = await fetch('/api/integrations/stripe/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          ...stripeConfig,
          currentCode,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          const upgrade = confirm(`${data.error}\n\nOpen Pricing?`);
          if (upgrade) window.location.href = '/pricing';
        } else {
          setPanelMessage(data.error || 'Stripe injection failed');
        }
        return;
      }

      setActiveIntegrations((prev) => [...new Set([...prev, 'stripe'])]);
      onIntegrationAdded(data.code, data.message, data.creditsRemaining);
      onStatusMessage?.(data.message);
      setShowStripeModal(false);
      setStripeConfig(DEFAULT_STRIPE);
      setPanelMessage('✅ Stripe payments added to your project!');
    } catch {
      setPanelMessage('Network error — could not add Stripe');
    } finally {
      setLoading(null);
    }
  };

  const handleNotifyMe = async (integrationName: string) => {
    if (!canNotify) {
      const upgrade = confirm(
        'Coming-soon integration alerts are available on Agency plan and above.\n\nOpen Pricing?'
      );
      if (upgrade) window.location.href = '/pricing';
      return;
    }

    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ integrationName }),
    });
    setPanelMessage(`We'll notify you when ${integrationName} is available.`);
  };

  const handleTestPayment = () => {
    setPanelMessage(
      '🧪 Test mode: use card 4242 4242 4242 4242, any future expiry, any CVC. Open your live preview to test checkout.'
    );
    onStatusMessage?.('Test card: 4242 4242 4242 4242 — use Stripe test keys (pk_test_…) for sandbox payments.');
  };

  const hasTierAccess = (tier: 'free' | 'pro' | 'agency') => {
    if (tier === 'free') return true;
    if (tier === 'pro') return canStripe;
    return canNotify;
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">🔌 Add Integrations</h3>
        <p className="text-[11px] text-nisk-muted mt-1">
          One-click payment and service integrations for your app.
        </p>
        {!projectId && (
          <p className="text-[10px] text-amber-400/90 mt-2">
            Save your project first to connect integrations.
          </p>
        )}
        {panelMessage && (
          <p className="text-[11px] text-[var(--accent-cyan)] mt-2">{panelMessage}</p>
        )}
      </div>

      {stripeActive && canRevenue && projectId && (
        <StripeRevenueWidget projectId={projectId} />
      )}

      {stripeActive && (
        <button
          type="button"
          onClick={handleTestPayment}
          className="w-full btn-secondary text-xs py-2 rounded-lg"
        >
          🧪 Test Payment (4242…)
        </button>
      )}

      <div className="space-y-2">
        {INTEGRATIONS.map((integration) => {
          const isActive = activeIntegrations.includes(integration.id);
          const isAvailable = integration.status === 'available';
          const hasAccess = hasTierAccess(integration.tier);

          return (
            <div
              key={integration.id}
              className={`p-3 rounded-xl border transition-all ${
                isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-nisk-surface border-nisk hover:border-[var(--accent-cyan)]/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xl shrink-0">{integration.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{integration.name}</p>
                      {isActive && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Connected
                        </span>
                      )}
                      {!isAvailable && (
                        <span className="text-[10px] text-nisk-muted">Coming soon</span>
                      )}
                    </div>
                    <p className="text-xs text-nisk-muted mt-0.5">{integration.description}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isActive ? (
                    <span className="text-[10px] text-emerald-400">✓ Added</span>
                  ) : !isAvailable ? (
                    <button
                      type="button"
                      onClick={() => handleNotifyMe(integration.name)}
                      className="px-2.5 py-1 text-[10px] btn-secondary rounded-lg"
                    >
                      Notify Me
                    </button>
                  ) : !hasAccess ? (
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/pricing'; }}
                      className="px-2.5 py-1 text-[10px] btn-primary rounded-lg"
                    >
                      Upgrade
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => integration.id === 'stripe' && setShowStripeModal(true)}
                      disabled={loading === integration.id || !projectId}
                      className="px-2.5 py-1 text-[10px] btn-primary rounded-lg disabled:opacity-40"
                    >
                      {loading === integration.id ? 'Adding…' : 'Add to Project'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showStripeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
          <div className="bg-nisk-card rounded-xl border border-nisk p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1">Add Stripe Payments</h2>
            <p className="text-xs text-nisk-muted mb-4">
              Uses your own Stripe account — we never store your secret keys on our servers for
              checkout (publishable key only in generated app).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-nisk-muted block mb-1">Payment type</label>
                <select
                  value={stripeConfig.paymentType}
                  onChange={(e) =>
                    setStripeConfig({
                      ...stripeConfig,
                      paymentType: e.target.value as 'one-time' | 'subscription',
                    })
                  }
                  className="w-full p-2 bg-nisk border border-nisk rounded-lg text-white text-sm"
                >
                  <option value="one-time">One-time payment</option>
                  <option value="subscription">Subscription (monthly/yearly)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-nisk-muted block mb-1">Product name</label>
                <input
                  type="text"
                  placeholder="e.g. Premium Plan"
                  value={stripeConfig.productName}
                  onChange={(e) =>
                    setStripeConfig({ ...stripeConfig, productName: e.target.value })
                  }
                  className="w-full p-2 bg-nisk border border-nisk rounded-lg text-white text-sm"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-nisk-muted block mb-1">Price</label>
                  <input
                    type="number"
                    placeholder="19.99"
                    value={stripeConfig.price}
                    onChange={(e) => setStripeConfig({ ...stripeConfig, price: e.target.value })}
                    className="w-full p-2 bg-nisk border border-nisk rounded-lg text-white text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-nisk-muted block mb-1">Currency</label>
                  <select
                    value={stripeConfig.currency}
                    onChange={(e) =>
                      setStripeConfig({ ...stripeConfig, currency: e.target.value })
                    }
                    className="w-full p-2 bg-nisk border border-nisk rounded-lg text-white text-sm"
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-nisk-muted block mb-1">
                  Stripe publishable key
                </label>
                <input
                  type="text"
                  placeholder="pk_test_…"
                  value={stripeConfig.publishableKey}
                  onChange={(e) =>
                    setStripeConfig({ ...stripeConfig, publishableKey: e.target.value })
                  }
                  className="w-full p-2 bg-nisk border border-nisk rounded-lg text-white text-sm font-mono"
                />
                <p className="text-[10px] text-nisk-muted mt-1">
                  From{' '}
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-cyan)] hover:underline"
                  >
                    Stripe Dashboard → API keys
                  </a>
                </p>
              </div>

              {canRevenue && (
                <div>
                  <label className="text-xs text-nisk-muted block mb-1">
                    Stripe secret key (optional — revenue dashboard only)
                  </label>
                  <input
                    type="password"
                    placeholder="sk_test_…"
                    value={stripeConfig.stripeSecretKey}
                    onChange={(e) =>
                      setStripeConfig({ ...stripeConfig, stripeSecretKey: e.target.value })
                    }
                    className="w-full p-2 bg-nisk border border-nisk rounded-lg text-white text-sm font-mono"
                  />
                  <p className="text-[10px] text-nisk-muted mt-1">
                    Agency+ only. Stored server-side for revenue stats — never embedded in your app.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowStripeModal(false)}
                className="flex-1 btn-secondary py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddStripe}
                disabled={
                  !stripeConfig.productName ||
                  !stripeConfig.price ||
                  !stripeConfig.publishableKey ||
                  loading === 'stripe'
                }
                className="flex-1 btn-primary py-2 rounded-lg text-sm disabled:opacity-50"
              >
                Add Stripe ({STRIPE_INJECT_CREDIT_COST} credits)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
