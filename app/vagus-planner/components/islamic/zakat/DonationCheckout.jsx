import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Lock, Zap, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function DonationCheckout({ charity, suggestedAmount = 0, user }) {
  const [amount, setAmount] = useState(suggestedAmount > 0 ? String(Math.ceil(suggestedAmount)) : '');
  const [donationType, setDonationType] = useState('one_time');
  const [loading, setLoading] = useState(false);

  const numAmount = parseFloat(amount) || 0;

  const handleDonate = async () => {
    if (!charity) { toast.error('Please select a charity first'); return; }
    if (numAmount < 1) { toast.error('Minimum donation is $1'); return; }

    if (window.self !== window.top) {
      toast.error('Donations are only available in the published app, not the preview.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('createZakatDonationCheckout', {
        amount: Math.round(numAmount * 100), // cents
        charity_id: charity.id,
        charity_name: charity.name,
        donation_type: donationType,
        donor_email: user?.email,
        donor_name: user?.full_name,
      });

      if (data?.error) { toast.error(data.error); setLoading(false); return; }
      if (data?.url) {
        toast.success('Redirecting to secure payment…');
        setTimeout(() => { window.location.href = data.url; }, 400);
      }
    } catch (err) {
      toast.error('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-slate-900 border-b border-amber-100 dark:border-amber-800/30">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">
            {charity ? `Donate to ${charity.name}` : 'Select a cause to donate'}
          </h3>
        </div>
        {charity && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
            <span>{charity.emoji}</span> {charity.description}
          </p>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Donation type */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {[
            { id: 'one_time', label: 'One-time' },
            { id: 'monthly', label: 'Monthly' },
            { id: 'zakat', label: 'Zakat' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setDonationType(t.id)}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                donationType === t.id
                  ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100'
                  : 'text-slate-500'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Preset amounts */}
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Amount (USD)</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {PRESET_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={cn(
                  'py-2 rounded-xl text-sm font-bold border transition-all',
                  String(a) === amount
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                )}
              >
                ${a}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <Input
              type="number"
              min="1"
              placeholder="Custom amount…"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="pl-7 border-amber-200 dark:border-amber-800/40 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Zakat note */}
        {donationType === 'zakat' && suggestedAmount > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
            <Zap className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Your calculated Zakat is <strong>${suggestedAmount.toFixed(2)}</strong>. We've pre-filled this amount.
            </p>
          </div>
        )}

        {/* Summary */}
        {numAmount > 0 && charity && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30 p-4 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Donation to</span>
              <span className="font-semibold">{charity.emoji} {charity.name}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Type</span>
              <span className="font-semibold capitalize">{donationType.replace('_', '-')}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 dark:text-slate-100 border-t border-amber-200 dark:border-amber-800/40 pt-2">
              <span>Total</span>
              <span className="text-amber-600">${numAmount.toFixed(2)}{donationType === 'monthly' ? '/mo' : ''}</span>
            </div>
          </div>
        )}

        {/* Donate button */}
        <Button
          onClick={handleDonate}
          disabled={!charity || numAmount < 1 || loading}
          className="w-full h-12 text-base font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 shadow-lg shadow-amber-300/20 rounded-xl gap-2"
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
          ) : (
            <><Heart className="w-5 h-5" /> Donate ${numAmount > 0 ? numAmount.toFixed(2) : '—'} Securely <ChevronRight className="w-4 h-4" /></>
          )}
        </Button>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400">
          <div className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Secured</div>
          <span>·</span>
          <div className="flex items-center gap-1">🔐 Stripe Payments</div>
          <span>·</span>
          <div className="flex items-center gap-1">✓ No card stored</div>
        </div>
      </div>
    </div>
  );
}