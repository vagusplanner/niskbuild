import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Heart, Moon, Shield } from 'lucide-react';
import IslamicEditionGate from '@/components/auth/IslamicEditionGate';
import ZakatCalculatorPanel from '@/components/islamic/zakat/ZakatCalculatorPanel';
import { createPageUrl } from '@/utils';

function ZakatDonationContent() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('JazakAllahu Khayran! Your donation was received. May Allah accept it.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      toast.info('Donation cancelled. No charges were made.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-safe px-3 sm:px-5 py-4">
      <Link
        to={`${createPageUrl('Islam')}?section=zakat`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1D6FB8] transition-colors min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Zakat & Finance
      </Link>

      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-semibold">
          <Moon className="w-4 h-4" /> Zakat & Sadaqah
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Donate & Give Zakat</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
          Review your calculated Zakat due, then log giving in the Islam hub. Verified charity checkout is coming soon.
        </p>
      </div>

      <ZakatCalculatorPanel onZakatCalculated={() => {}} />

      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Verified charities & Stripe checkout
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Coming soon — new charity partners. Choose-a-cause directory and secure Stripe payments are not live yet.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full whitespace-nowrap">
            Coming soon
          </span>
        </div>
        <button
          type="button"
          disabled
          className="w-full rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-sm font-semibold py-3 cursor-not-allowed"
        >
          Donate securely via Stripe (unavailable)
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" /> Log giving now
        </p>
        <p className="text-xs text-slate-500">
          Use “I gave elsewhere — log it here” on the Give tab to track Zakat and charity without waiting for partner checkout.
        </p>
        <Link
          to={`${createPageUrl('Islam')}?section=zakat&tab=give`}
          className="inline-flex items-center justify-center w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm py-3"
        >
          Open Give tab in Islam hub
        </Link>
      </div>
    </div>
  );
}

export default function ZakatDonation() {
  return (
    <IslamicEditionGate>
      <ZakatDonationContent />
    </IslamicEditionGate>
  );
}
