import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, CheckCircle2, Circle, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

const NIKAH_CHECKLIST = [
  { category: 'Pre-Nikah', items: ['Both parties have consented freely', 'Wali (guardian) identified for bride', 'Witnesses arranged (minimum 2 Muslim adults)', 'Mehr (Mahr) agreed upon', 'Islamic pre-marital course attended', 'Medical tests completed'] },
  { category: 'Nikah Ceremony', items: ['Imam / scholar confirmed', 'Ijab (offer) prepared', 'Qabool (acceptance) prepared', 'Marriage contract (Aqd) reviewed', 'Civil marriage registered or planned', 'Witnesses present & identified'] },
  { category: 'Post-Nikah', items: ['Walima (feast) planned within 3 days', 'Mahr payment schedule agreed', 'Housing arrangement confirmed', 'Rights & responsibilities discussed', 'Family introductions completed'] },
];

function ChecklistSection({ section }) {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState({});
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{section.category}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">{done}/{section.items.length}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {section.items.map((item, i) => (
            <button key={i} onClick={() => setChecked(p => ({...p, [i]: !p[i]}))}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
              {checked[i] ? <CheckCircle2 className="w-4 h-4 text-rose-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
              <span className={`text-sm ${checked[i] ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MahrTracker() {
  const [mahr, setMahr] = useState({ amount: '', currency: 'GBP', type: 'gold', paidNow: '', deferredAmount: '', deferredDate: '', notes: '' });

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">Mahr (marriage gift) is an obligatory gift from the groom to the bride, agreed before the Nikah. It is her exclusive right.</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Mahr Amount</label>
          <input value={mahr.amount} onChange={e => setMahr(p => ({...p, amount: e.target.value}))} placeholder="e.g. 5000"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Currency</label>
          <select value={mahr.currency} onChange={e => setMahr(p => ({...p, currency: e.target.value}))}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 h-[38px]">
            <option>GBP</option><option>USD</option><option>EUR</option><option>SAR</option><option>PKR</option><option>EGP</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Type</label>
          <select value={mahr.type} onChange={e => setMahr(p => ({...p, type: e.target.value}))}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 h-[38px]">
            <option value="gold">Gold</option><option value="cash">Cash</option><option value="property">Property</option><option value="jewellery">Jewellery</option><option value="education">Education</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Paid at Nikah</label>
          <input value={mahr.paidNow} onChange={e => setMahr(p => ({...p, paidNow: e.target.value}))} placeholder="Prompt portion"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Deferred Amount</label>
          <input value={mahr.deferredAmount} onChange={e => setMahr(p => ({...p, deferredAmount: e.target.value}))} placeholder="Deferred portion"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Deferred By</label>
          <input type="date" value={mahr.deferredDate} onChange={e => setMahr(p => ({...p, deferredDate: e.target.value}))}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
        </div>
      </div>
      <textarea value={mahr.notes} onChange={e => setMahr(p => ({...p, notes: e.target.value}))} placeholder="Additional notes about the Mahr agreement…"
        rows={2} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400" />

      {mahr.amount && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-rose-500" />
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Mahr Summary</p>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-300">
            Total: <strong>{mahr.currency} {mahr.amount}</strong> ({mahr.type}) |
            Prompt: <strong>{mahr.paidNow || '—'}</strong> |
            Deferred: <strong>{mahr.deferredAmount || '—'}</strong>
            {mahr.deferredDate && ` by ${mahr.deferredDate}`}
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default function IslamicMarriagePlanner() {
  const [tab, setTab] = useState('checklist');

  return (
    <div className="rounded-2xl border border-rose-100 dark:border-rose-900 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="px-5 py-4 bg-gradient-to-r from-rose-600 to-pink-600 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          <Heart className="w-5 h-5 text-rose-200" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Islamic Marriage Planner</h3>
          <p className="text-xs text-rose-200">Nikah checklist · Mahr tracker · Planning tools</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {[{ id: 'checklist', label: 'Nikah Checklist' }, { id: 'mahr', label: 'Mahr Tracker' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t.id ? 'text-rose-600 border-b-2 border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {tab === 'checklist' && NIKAH_CHECKLIST.map(s => <ChecklistSection key={s.category} section={s} />)}
        {tab === 'mahr' && <MahrTracker />}
      </div>
    </div>
  );
}