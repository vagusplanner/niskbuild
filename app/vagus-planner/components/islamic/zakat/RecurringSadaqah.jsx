/**
 * RecurringSadaqah
 * Allows users to set up automatic daily or weekly micro-donations to verified Islamic charities.
 * - Integrates with Stripe Checkout (subscription mode)
 * - Tracks active subscriptions in CharityDonation entity
 * - Allows cancellation
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CHARITIES } from './CharitySelector';
import {
  Heart, RefreshCw, Loader2, CheckCircle2, X, AlertCircle,
  Calendar, Zap, Lock, TrendingUp, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_AMOUNTS = [1, 2, 5, 10, 25];

const INTERVAL_OPTIONS = [
  { id: 'day',  label: 'Daily',  sublabel: 'Every day', icon: '☀️' },
  { id: 'week', label: 'Weekly', sublabel: 'Every week', icon: '📅' },
];

function annualEstimate(amount, interval) {
  const times = interval === 'day' ? 365 : 52;
  return (amount * times).toFixed(0);
}

export default function RecurringSadaqah() {
  const queryClient = useQueryClient();

  const [selectedCharity, setSelectedCharity] = useState(null);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('week');
  const [loading, setLoading] = useState(false);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: activeSubs = [], isLoading: subsLoading } = useQuery({
    queryKey: ['sadaqahSubs', user?.email],
    queryFn: async () => {
      const all = await base44.entities.CharityDonation.filter({
        created_by: user?.email,
        is_recurring: true,
      });
      return all.filter(d => d.status === 'active' || d.status === 'cancelling');
    },
    enabled: !!user?.email,
  });

  // Handle Stripe redirect back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sadaqah_success') === 'true') {
      const sessionId = params.get('session_id');
      toast.success('JazakAllahu Khayran! Your recurring Sadaqah is now active 🤲');
      // Record in DB
      if (sessionId && user?.email && selectedCharity) {
        base44.entities.CharityDonation.create({
          amount: parseFloat(amount) || 0,
          charity_id: selectedCharity?.id || '',
          charity_name: selectedCharity?.name || 'Islamic Charity',
          type: 'sadaqah',
          date: new Date().toISOString().split('T')[0],
          is_recurring: true,
          recurrence_interval: frequency,
          stripe_session_id: sessionId,
          status: 'active',
        }).then(() => queryClient.invalidateQueries({ queryKey: ['sadaqahSubs'] }));
      }
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('sadaqah_canceled') === 'true') {
      toast.info('Sadaqah setup cancelled. No charges were made.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const cancelMutation = useMutation({
    mutationFn: async ({ subscription_id, record_id }) => {
      const { data } = await base44.functions.invoke('cancelSadaqahSubscription', {
        subscription_id,
        record_id,
      });
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Sadaqah subscription will be cancelled at end of billing period.');
      queryClient.invalidateQueries({ queryKey: ['sadaqahSubs'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSetup = async () => {
    if (window.self !== window.top) {
      toast.error('Recurring donations are only available in the published app, not the preview.');
      return;
    }
    if (!selectedCharity) { toast.error('Please select a charity'); return; }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) { toast.error('Minimum donation is $1'); return; }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('createSadaqahSubscription', {
        amount_cents: Math.round(numAmount * 100),
        charity_id: selectedCharity.id,
        charity_name: selectedCharity.name,
        interval: frequency,
        donor_name: user?.full_name || '',
      });
      if (data?.error) { toast.error(data.error); setLoading(false); return; }
      if (data?.url) {
        // Store selection in sessionStorage so we can record after redirect
        sessionStorage.setItem('sadaqah_pending', JSON.stringify({ charity: selectedCharity, amount, interval: frequency }));
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error('Failed to set up subscription. Please try again.');
      setLoading(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;

  return (
    <div className="space-y-6">
      {/* Active subscriptions */}
      {subsLoading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading active subscriptions…
        </div>
      ) : activeSubs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Active Sadaqah</p>
          </div>
          {activeSubs.map(sub => {
            const charity = CHARITIES.find(c => c.id === sub.charity_id);
            return (
              <motion.div key={sub.id} layout
                className={cn(
                  'flex items-center gap-3 p-4 rounded-2xl border',
                  sub.status === 'cancelling'
                    ? 'border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-950/10'
                    : 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/10'
                )}>
                <span className="text-2xl">{charity?.emoji || '🤲'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{sub.charity_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ${sub.amount} / {sub.recurrence_interval === 'day' ? 'day' : 'week'}
                    {' · '}~${annualEstimate(sub.amount, sub.recurrence_interval)}/year
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {sub.status === 'cancelling' ? (
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Cancelling</Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Active
                    </Badge>
                  )}
                  {sub.status === 'active' && (
                    <button
                      onClick={() => cancelMutation.mutate({ subscription_id: sub.stripe_subscription_id, record_id: sub.id })}
                      disabled={cancelMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-colors"
                      title="Cancel subscription"
                    >
                      {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Setup new */}
      <div className="rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-white" />
            <h3 className="font-black text-white text-base">Set Up Recurring Sadaqah</h3>
          </div>
          <p className="text-rose-200 text-xs mt-1">
            Automate your giving — small daily acts of charity that add up throughout the year.
          </p>
        </div>

        <div className="p-4 space-y-5">
          {/* Charity selection */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Choose a Cause</p>
            <div className="grid grid-cols-2 gap-2">
              {CHARITIES.map(c => (
                <button key={c.id} onClick={() => setSelectedCharity(c)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl border text-left transition-all',
                    selectedCharity?.id === c.id
                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800'
                  )}>
                  <span className="text-xl flex-shrink-0">{c.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{c.category}</p>
                  </div>
                  {selectedCharity?.id === c.id && <CheckCircle2 className="w-4 h-4 text-rose-500 ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Frequency</p>
            <div className="grid grid-cols-2 gap-2">
              {INTERVAL_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setFrequency(opt.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    frequency === opt.id
                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800'
                  )}>
                  <span className="text-xl">{opt.icon}</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{opt.label}</p>
                    <p className="text-[10px] text-slate-400">{opt.sublabel}</p>
                  </div>
                  {frequency === opt.id && <CheckCircle2 className="w-4 h-4 text-rose-500 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
              Amount per {frequency === 'day' ? 'day' : 'week'} (USD)
            </p>
            <div className="flex gap-2 mb-2 flex-wrap">
              {PRESET_AMOUNTS.map(a => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm font-bold border transition-all',
                    String(a) === amount
                      ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-300'
                  )}>
                  ${a}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <Input type="number" min="1" placeholder="Custom…" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-7 border-rose-100 dark:border-rose-900/40" />
            </div>
          </div>

          {/* Impact preview */}
          <AnimatePresence>
            {numAmount >= 1 && selectedCharity && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-100 dark:border-rose-900/40 p-4 space-y-2">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Your Annual Impact
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    {selectedCharity.emoji} {selectedCharity.name}
                  </span>
                  <span className="font-black text-rose-600 dark:text-rose-400">
                    ~${annualEstimate(numAmount, frequency)}/year
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Star className="w-3 h-3 text-amber-400" />
                  Ongoing Sadaqah Jariyah — rewards that continue after you
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <Button onClick={handleSetup} disabled={!selectedCharity || numAmount < 1 || loading}
            className="w-full h-12 text-base font-black bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-90 shadow-lg shadow-rose-300/20 rounded-xl gap-2">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>
              : <><Heart className="w-5 h-5" /> Start ${numAmount > 0 ? numAmount : '—'} {frequency === 'day' ? 'Daily' : 'Weekly'} Sadaqah</>
            }
          </Button>

          <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Secured</span>
            <span>·</span>
            <span>🔐 Stripe Subscriptions</span>
            <span>·</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* Hadith */}
      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/40 text-center">
        <p className="text-xs text-indigo-700 dark:text-indigo-300 italic leading-relaxed">
          "The most beloved deed to Allah is the most consistent, even if it is small."
        </p>
        <p className="text-[10px] text-indigo-500 mt-1">— Bukhari & Muslim</p>
      </div>
    </div>
  );
}