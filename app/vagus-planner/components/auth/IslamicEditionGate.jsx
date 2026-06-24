/**
 * IslamicEditionGate
 *
 * Wraps any Islamic-only content. Shows an outcome-focused upgrade prompt for Standard users.
 *
 * Usage:
 *   <IslamicEditionGate>
 *     <MyIslamicComponent />
 *   </IslamicEditionGate>
 *
 * Or as a full-page block (page=true):
 *   <IslamicEditionGate page />
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Lock, Star, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIslamicEdition } from '@/hooks/useIslamicEdition';

const ISLAMIC_HIGHLIGHTS = [
  { icon: '🕌', text: 'Never miss a prayer — Adhan alerts & Qibla finder' },
  { icon: '📖', text: 'Read & memorize Quran with guided recitation' },
  { icon: '🌙', text: 'Ramadan planner, fasting tracker & leaderboards' },
  { icon: '🕋', text: 'Hajj & Umrah journey guide with group tools' },
  { icon: '💰', text: 'Zakat al-Māl calculator with multi-year tracking' },
  { icon: '🤖', text: 'AI Islamic coach & personalised Dua generator' },
  { icon: '📿', text: 'Dhikr counter, Sunnah habits & Life Score' },
  { icon: '❤️', text: 'Family prayer hub — track your household together' },
];

function UpgradePrompt({ compact = false }) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex-shrink-0">
          <Moon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Islamic Edition Required</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">Upgrade to access prayer, Quran, Zakat & more.</p>
        </div>
        <Button
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 flex-shrink-0 h-8 text-xs font-bold"
          onClick={() => navigate('/Billing')}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[60vh] flex items-center justify-center px-4 py-12"
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-xl shadow-amber-400/30">
            <Moon className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 border-2 border-amber-400 flex items-center justify-center">
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* Heading */}
        <div>
          <div className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-full mb-3 border border-amber-200 dark:border-amber-700">
            <Star className="w-3 h-3 fill-amber-500" />
            Islamic Edition
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
            Unlock Your Full Spiritual Life
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            The Islamic Edition includes everything in Standard plus a complete spiritual toolkit built for Muslim life.
          </p>
        </div>

        {/* Features */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4 text-left space-y-2.5">
          {ISLAMIC_HIGHLIGHTS.map(f => (
            <div key={f.text} className="flex items-center gap-3 text-sm">
              <span className="text-base flex-shrink-0">{f.icon}</span>
              <span className="text-slate-700 dark:text-slate-300">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Pricing hint */}
        <p className="text-xs text-slate-400">
          Starting from <span className="text-amber-600 dark:text-amber-400 font-bold">$9.99/month</span> · 14-day free trial · Cancel anytime
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold h-11 hover:opacity-90 shadow-lg shadow-amber-400/20"
            onClick={() => navigate('/Billing')}
          >
            Upgrade to Islamic Edition <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button variant="outline" className="w-full h-11 text-slate-500" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function IslamicEditionGate({ children, compact = false, page = false }) {
  const { isIslamicEdition, isLoading } = useIslamicEdition();

  if (isLoading) {
    return compact ? null : (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isIslamicEdition) {
    return <UpgradePrompt compact={compact} />;
  }

  return <>{children}</>;
}