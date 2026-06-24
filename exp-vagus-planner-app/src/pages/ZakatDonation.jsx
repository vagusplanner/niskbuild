import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Shield, Heart, Moon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import IslamicEditionGate from '@/components/auth/IslamicEditionGate';
import ZakatCalculatorPanel from '@/components/islamic/zakat/ZakatCalculatorPanel';
import CharitySelector from '@/components/islamic/zakat/CharitySelector';
import DonationCheckout from '@/components/islamic/zakat/DonationCheckout';
import RecurringSadaqah from '@/components/islamic/zakat/RecurringSadaqah';

function ZakatDonationContent() {
  const [zakatResult, setZakatResult] = useState({ zakatDue: 0, meetsNisab: false });
  const [selectedCharity, setSelectedCharity] = useState(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => SDK.auth.me() });

  // Handle Stripe redirect back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('JazakAllahu Khayran! Your donation was received. May Allah accept it. 🤲');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      toast.info('Donation cancelled. No charges were made.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-safe">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-semibold mb-1">
          <Moon className="w-4 h-4" /> Zakat & Sadaqah
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Donate & Give Zakat</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
          Calculate your obligatory Zakat and donate securely in one place. All payments are processed via Stripe — safe, encrypted, and instant.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400 mt-2">
          <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-emerald-500" /> SSL Encrypted</span>
          <span>·</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verified Charities</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-500" /> Sadaqah Jariyah</span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: calculator + charity */}
        <div className="lg:col-span-3 space-y-6">
          <ZakatCalculatorPanel onZakatCalculated={setZakatResult} />
          <CharitySelector selected={selectedCharity} onSelect={setSelectedCharity} />
        </div>

        {/* Right: checkout + recurring sadaqah (sticky) */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-6">
            <DonationCheckout
              charity={selectedCharity}
              suggestedAmount={zakatResult.zakatDue}
              user={user}
            />
            {/* Hadith on giving */}
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/40 text-center">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 italic leading-relaxed">
                "The believer's shade on the Day of Resurrection will be his charity."
              </p>
              <p className="text-[10px] text-indigo-500 mt-1">— Tirmidhi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recurring Sadaqah — full width below the grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-200 dark:via-rose-800/40 to-transparent" />
          <span className="text-xs font-bold text-rose-500 uppercase tracking-widest px-2">Recurring Sadaqah</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-200 dark:via-rose-800/40 to-transparent" />
        </div>
        <RecurringSadaqah />
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