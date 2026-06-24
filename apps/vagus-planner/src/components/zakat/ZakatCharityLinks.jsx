import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Heart, Globe, Shield, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHARITIES = [
  {
    name: 'National Zakat Foundation (UK)',
    short: 'NZF',
    flag: '🇬🇧',
    desc: 'UK-registered, distributes Zakat locally to Muslims in need across the UK.',
    url: 'https://nzf.org.uk/give/zakat/',
    category: 'UK',
    verified: true,
    rating: '★★★★★',
    regNo: 'Charity No. 1153719',
    color: 'from-green-600 to-emerald-700',
  },
  {
    name: 'Islamic Relief Worldwide',
    short: 'IR',
    flag: '🌍',
    desc: 'One of the world\'s largest Muslim charities — distributes Zakat across 40+ countries.',
    url: 'https://www.islamic-relief.org/zakat/',
    category: 'Global',
    verified: true,
    rating: '★★★★★',
    regNo: 'Charity No. 328158',
    color: 'from-teal-600 to-cyan-700',
  },
  {
    name: 'Muslim Aid',
    short: 'MA',
    flag: '🌐',
    desc: 'UK-based international charity accepting and distributing Zakat al-Māl globally.',
    url: 'https://www.muslimaid.org/zakat/',
    category: 'Global',
    verified: true,
    rating: '★★★★☆',
    regNo: 'Charity No. 295224',
    color: 'from-blue-600 to-indigo-700',
  },
  {
    name: 'Human Appeal',
    short: 'HA',
    flag: '🌍',
    desc: 'Award-winning UK charity delivering Zakat to 25+ countries with full transparency.',
    url: 'https://humanappeal.org.uk/zakat',
    category: 'Global',
    verified: true,
    rating: '★★★★★',
    regNo: 'Charity No. 1154288',
    color: 'from-orange-600 to-amber-700',
  },
  {
    name: 'Penny Appeal',
    short: 'PA',
    flag: '🌍',
    desc: 'Innovative UK Islamic charity with Zakat programme for poverty relief worldwide.',
    url: 'https://www.pennyappeal.org/zakat',
    category: 'UK',
    verified: true,
    rating: '★★★★☆',
    regNo: 'Charity No. 1128341',
    color: 'from-rose-600 to-pink-700',
  },
  {
    name: 'Zakat Foundation of America',
    short: 'ZFA',
    flag: '🇺🇸',
    desc: 'Leading US Zakat organisation distributing across the USA and internationally.',
    url: 'https://www.zakat.org/zakat',
    category: 'USA',
    verified: true,
    rating: '★★★★★',
    regNo: 'EIN: 36-4476244',
    color: 'from-violet-600 to-purple-700',
  },
  {
    name: 'Qatar Charity',
    short: 'QC',
    flag: '🇶🇦',
    desc: 'One of the Middle East\'s most established humanitarian organisations.',
    url: 'https://www.qcharity.org/en/qa/donate',
    category: 'Gulf',
    verified: true,
    rating: '★★★★★',
    regNo: 'Qatar-based, INGO status',
    color: 'from-sky-600 to-blue-700',
  },
  {
    name: 'Ummah Welfare Trust',
    short: 'UWT',
    flag: '🌐',
    desc: 'Conservative UK charity distributing Zakat directly with minimal overhead.',
    url: 'https://uwt.org/zakat/',
    category: 'UK',
    verified: true,
    rating: '★★★★★',
    regNo: 'Charity No. 1000851',
    color: 'from-emerald-600 to-teal-700',
  },
];

const CATEGORIES = ['All', 'UK', 'Global', 'USA', 'Gulf'];

export default function ZakatCharityLinks({ zakatDue, currency }) {
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP', maximumFractionDigits: 2 }).format(n || 0);
  const filtered = filter === 'All' ? CHARITIES : CHARITIES.filter(c => c.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-white text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-400" /> Pay Your Zakat
          </h3>
          <p className="text-white/50 text-xs mt-0.5">8 verified global Islamic charities — click to pay directly</p>
        </div>
        {zakatDue > 0 && (
          <div className="text-right">
            <p className="text-xs text-amber-400/70 font-semibold">Due</p>
            <p className="text-xl font-black text-amber-400">{fmt(zakatDue)}</p>
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              filter === cat ? 'bg-amber-400 text-[#071224] border-amber-400' : 'border-white/10 text-white/50 hover:text-white hover:border-white/30'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((charity) => (
          <motion.div key={charity.name} layout
            className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-white/20 transition-all">
            <div className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${charity.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                <span className="text-white text-xs font-black">{charity.short}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white truncate">{charity.flag} {charity.name}</p>
                  {charity.verified && (
                    <span className="flex items-center gap-0.5 text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      <Shield className="w-2.5 h-2.5" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-amber-400/60 font-medium mt-0.5">{charity.rating} · {charity.regNo}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setExpanded(expanded === charity.name ? null : charity.name)}
                  className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
                  {expanded === charity.name ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <a href={charity.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-[#071224] font-bold text-xs h-8 px-3 gap-1">
                    Pay <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            </div>

            <AnimatePresence>
              {expanded === charity.name && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="px-4 pb-4 pt-0 border-t border-white/5">
                    <p className="text-xs text-white/60 leading-relaxed mt-3 mb-3">{charity.desc}</p>
                    {zakatDue > 0 && (
                      <div className="flex items-center gap-3 bg-amber-400/8 border border-amber-400/15 rounded-xl p-3 mb-3">
                        <Heart className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <p className="text-xs text-amber-300/80">
                          You can pay your full Zakat of <strong className="text-amber-400">{fmt(zakatDue)}</strong> directly through their secure website.
                        </p>
                      </div>
                    )}
                    <a href={charity.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#38bdf8] hover:text-white transition-colors">
                      <Globe className="w-3.5 h-3.5" /> {charity.url}
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <p className="text-center text-white/25 text-[10px] leading-relaxed">
        All charities are registered and independently verified. Vagus Planner does not process payments directly — you will be taken to each charity's secure website.
      </p>
    </div>
  );
}