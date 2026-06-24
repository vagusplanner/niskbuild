import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, Trash2, CheckCircle2, Circle, Star, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CATEGORIES = ['Family', 'Children', 'Friends', 'Colleagues', 'Charity'];
const EID_TYPES = ['Eid al-Fitr', 'Eid al-Adha'];

export default function EidGiftPlanner() {
  const [eidType, setEidType] = useState('Eid al-Fitr');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [gifts, setGifts] = useState([
    { id: 1, recipient: 'Children', gift: '', amount: '', category: 'Children', purchased: false, notes: '' },
  ]);

  const addGift = () => {
    setGifts(g => [...g, { id: Date.now(), recipient: '', gift: '', amount: '', category: 'Family', purchased: false, notes: '' }]);
  };

  const removeGift = (id) => setGifts(g => g.filter(x => x.id !== id));

  const updateGift = (id, field, value) => {
    setGifts(g => g.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const totalSpent = gifts.reduce((s, g) => s + (parseFloat(g.amount) || 0), 0);
  const totalBudget = parseFloat(budget) || 0;
  const remaining = totalBudget - totalSpent;
  const progress = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    items: gifts.filter(g => g.category === cat),
    total: gifts.filter(g => g.category === cat).reduce((s, g) => s + (parseFloat(g.amount) || 0), 0),
  })).filter(c => c.items.length > 0);

  return (
    <div className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          <Gift className="w-5 h-5 text-amber-100" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Eid Gift Planner & Budget</h3>
          <p className="text-xs text-amber-100">Plan, track & budget your Eid gifting</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Setup */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className="text-xs text-slate-500 mb-1 block">Eid Type</label>
            <select value={eidType} onChange={e => setEidType(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400">
              {EID_TYPES.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Total Budget</label>
            <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="500" className="h-9 text-xs" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option>GBP</option><option>USD</option><option>EUR</option><option>SAR</option>
            </select>
          </div>
        </div>

        {/* Budget bar */}
        {totalBudget > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Spent: <strong className="text-slate-700 dark:text-slate-300">{currency} {totalSpent.toFixed(2)}</strong></span>
              <span className={`font-bold ${remaining < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{remaining < 0 ? 'Over by' : 'Left:'} {currency} {Math.abs(remaining).toFixed(2)}</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                className={`h-full rounded-full transition-all ${progress > 100 ? 'bg-red-500' : progress > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
            </div>
          </div>
        )}

        {/* Gift list */}
        <div className="space-y-2">
          {gifts.map(gift => (
            <div key={gift.id} className={`p-3 rounded-xl border transition-all ${gift.purchased ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
              <div className="flex items-start gap-2">
                <button onClick={() => updateGift(gift.id, 'purchased', !gift.purchased)} className="mt-1 flex-shrink-0">
                  {gift.purchased ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                </button>
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  <Input value={gift.recipient} onChange={e => updateGift(gift.id, 'recipient', e.target.value)} placeholder="Recipient name" className="h-7 text-xs" />
                  <Input value={gift.gift} onChange={e => updateGift(gift.id, 'gift', e.target.value)} placeholder="Gift idea" className="h-7 text-xs" />
                  <select value={gift.category} onChange={e => updateGift(gift.id, 'category', e.target.value)}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <Input type="number" value={gift.amount} onChange={e => updateGift(gift.id, 'amount', e.target.value)} placeholder={`Amount (${currency})`} className="h-7 text-xs" />
                </div>
                <button onClick={() => removeGift(gift.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={addGift} variant="outline" className="w-full h-9 text-xs border-dashed">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Gift
        </Button>

        {/* Category summary */}
        {byCategory.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">By Category</p>
            {byCategory.map(c => (
              <div key={c.cat} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">{c.cat}</span>
                  <span className="text-[10px] text-slate-400">({c.items.length} item{c.items.length > 1 ? 's' : ''})</span>
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{currency} {c.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Eid spirit note */}
        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border border-amber-100 dark:border-amber-900 text-center">
          <p className="text-xs text-amber-700 dark:text-amber-300 italic">
            {eidType === 'Eid al-Fitr'
              ? '🌙 "The best of you is the one who learns the Quran and teaches it." — The joy of giving during Eid is sunnah!'
              : '🐑 "Their meat will not reach Allah, nor will their blood, but what reaches Him is piety from you." (22:37)'}
          </p>
        </div>
      </div>
    </div>
  );
}