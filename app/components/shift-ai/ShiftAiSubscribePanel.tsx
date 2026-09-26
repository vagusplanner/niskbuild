'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import {
  startSe8Checkout,
  type Se8CheckoutInterval,
  type Se8CheckoutPlan,
} from '@/lib/shift-ai/checkout-client';
import { SA } from '@/lib/shift-ai/theme';
import { shiftAiAppPath } from '@/lib/supereduc8-host';

type Props = {
  defaultPlan?: Se8CheckoutPlan;
  defaultInterval?: Se8CheckoutInterval;
  defaultChildQuantity?: number;
  /** Compact layout for upgrade modal */
  compact?: boolean;
  onStarted?: (sessionId: string) => void;
};

export default function ShiftAiSubscribePanel({
  defaultPlan = 'student',
  defaultInterval = 'month',
  defaultChildQuantity = 0,
  compact = false,
  onStarted,
}: Props) {
  const [plan, setPlan] = useState<Se8CheckoutPlan>(
    defaultPlan === 'family' || defaultChildQuantity > 0 ? 'family' : 'student'
  );
  const [interval, setInterval] = useState<Se8CheckoutInterval>(defaultInterval);
  const [childQuantity, setChildQuantity] = useState(
    Math.max(0, Math.min(20, defaultChildQuantity))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const billingPath = shiftAiAppPath('/billing');
      const result = await startSe8Checkout({
        plan: plan === 'family' || childQuantity > 0 ? 'family' : 'student',
        interval,
        childQuantity: plan === 'family' ? childQuantity : 0,
        successUrl: `${origin}${billingPath}?checkout=success`,
        cancelUrl: `${origin}${billingPath}?checkout=canceled`,
      });

      if (!result.ok) {
        if (result.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(billingPath)}`;
          return;
        }
        setError(result.error);
        return;
      }

      onStarted?.(result.sessionId);
      window.location.href = result.sessionUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact ? (
        <p className={`text-sm ${SA.muted}`}>
          14-day free trial covers full access with no card. Subscribe anytime to keep premium
          features after the trial ends.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setInterval('month')}
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
            interval === 'month'
              ? 'border-[var(--sa-navy-800)] bg-[var(--sa-navy-800)] text-white'
              : 'border-[var(--sa-navy-100)]'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval('year')}
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
            interval === 'year'
              ? 'border-[var(--sa-navy-800)] bg-[var(--sa-navy-800)] text-white'
              : 'border-[var(--sa-navy-100)]'
          }`}
        >
          Annual (2 mo free)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setPlan('student');
            setChildQuantity(0);
          }}
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
            plan === 'student'
              ? 'border-[var(--sa-navy-800)] bg-[var(--sa-navy-800)] text-white'
              : 'border-[var(--sa-navy-100)]'
          }`}
        >
          Student
        </button>
        <button
          type="button"
          onClick={() => setPlan('family')}
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
            plan === 'family'
              ? 'border-[var(--sa-navy-800)] bg-[var(--sa-navy-800)] text-white'
              : 'border-[var(--sa-navy-100)]'
          }`}
        >
          Family
        </button>
      </div>

      {plan === 'family' ? (
        <label className="block">
          <span className={`mb-1 block text-xs font-medium ${SA.muted}`}>
            Additional children (+$6.99/mo or +$69.90/yr each)
          </span>
          <input
            type="number"
            min={0}
            max={20}
            value={childQuantity}
            onChange={(e) =>
              setChildQuantity(Math.max(0, Math.min(20, Number(e.target.value) || 0)))
            }
            className={SA.input}
          />
        </label>
      ) : null}

      {error ? <div className={SA.error}>{error}</div> : null}

      <button
        type="button"
        onClick={() => void subscribe()}
        disabled={loading}
        className={`${SA.btnPrimary} w-full py-2.5`}
        data-testid="se8-subscribe-button"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {loading ? 'Starting checkout…' : 'Subscribe'}
      </button>
    </div>
  );
}
