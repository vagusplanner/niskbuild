/**
 * FamilyHubOnboarding — step-by-step intro shown once when a user first lands on Family Hub.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Sun, Map, Heart, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GA } from '@/lib/ga4';

const STEPS = [
  {
    icon: Users,
    emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66',
    title: 'Welcome to Family Hub',
    subtitle: 'Connect your household for shared spiritual accountability.',
    desc: 'Create a family group and share an invite code so every family member can join from their own account.',
    color: 'from-teal-500 to-emerald-600',
  },
  {
    icon: Sun,
    emoji: '\uD83D\uDD4C',
    title: 'Shared Prayer Goals',
    subtitle: 'Pray together, grow together.',
    desc: 'Set a family prayer goal and each member logs their own daily progress.',
    color: 'from-amber-400 to-orange-500',
  },
  {
    icon: Map,
    emoji: '\uD83D\uDD4B',
    title: 'Collaborative Hajj Planning',
    subtitle: 'Plan the journey of a lifetime as a family.',
    desc: 'Track your Hajj savings progress, target year, and share planning notes all in one place.',
    color: 'from-rose-500 to-pink-600',
  },
  {
    icon: Heart,
    emoji: '\uD83D\uDC9D',
    title: 'Family Zakat Ledger',
    subtitle: "One ledger for all your family giving.",
    desc: "Log Zakat, Sadaqah, Hajj savings and charity donations. See everyone contribution at a glance.",
    color: 'from-pink-500 to-rose-600',
  },
];

export default function FamilyHubOnboarding({ onDone }) {
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  const handleNext = () => {
    GA.onboardingStep('family_hub_' + (step + 1));
    if (isLast) {
      GA.onboardingComplete(['family_hub']);
      localStorage.setItem('family_hub_onboarding_done', '1');
      onDone();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('family_hub_onboarding_done', '1');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
      >
        <div className={"bg-gradient-to-br " + current.color + " p-8 text-center relative"}>
          <button onClick={handleSkip} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="text-5xl mb-3">{current.emoji}</div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">{current.title}</h2>
              <p className="text-sm text-white/80 font-medium">{current.subtitle}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 space-y-5">
          <AnimatePresence mode="wait">
            <motion.p key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed">
              {current.desc}
            </motion.p>
          </AnimatePresence>

          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={cn('h-1.5 rounded-full transition-all',
                i === step ? 'w-6 bg-teal-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
              )} />
            ))}
          </div>

          <Button onClick={handleNext}
            className="w-full h-11 font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-400/20">
            {isLast
              ? <><CheckCircle2 className="w-4 h-4 mr-2" />Get Started</>
              : <>Next <ArrowRight className="w-4 h-4 ml-1" /></>}
          </Button>

          {!isLast && (
            <button onClick={handleSkip} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Skip intro
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}