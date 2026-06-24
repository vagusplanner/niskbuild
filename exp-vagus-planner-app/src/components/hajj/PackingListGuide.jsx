import React, { useState } from 'react';
import { PACKING_LIST } from './data/hajjData';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';

const PRIORITY_STYLE = {
  essential: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  important: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  optional: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function PackingListGuide() {
  const [gender, setGender] = useState('men');
  const [checked, setChecked] = useState({});

  const toggleCheck = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));

  const allCategories = [
    ...(PACKING_LIST[gender] || []),
    ...PACKING_LIST.shared,
  ];

  const totalItems = allCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Gender selector */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {[{ id: 'men', label: '👔 Men' }, { id: 'women', label: '👗 Women' }].map(g => (
          <button key={g.id} onClick={() => { setGender(g.id); setChecked({}); }}
            className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all",
              gender === g.id ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800">
        <div className="flex-1">
          <p className="text-xs font-bold text-teal-700 dark:text-teal-300">{checkedCount} / {totalItems} items packed</p>
          <div className="h-1.5 bg-teal-100 dark:bg-teal-900 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all" style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }} />
          </div>
        </div>
        <span className="text-lg font-black text-teal-600 dark:text-teal-400">{totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0}%</span>
      </div>

      {/* Categories */}
      {allCategories.map((cat, ci) => (
        <div key={ci} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
            <p className="font-black text-sm text-slate-700 dark:text-slate-200">{cat.category}</p>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {cat.items.map((item, ii) => {
              const key = `${ci}-${ii}`;
              const done = checked[key];
              return (
                <button key={ii} onClick={() => toggleCheck(key)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    : <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-medium", done && "line-through text-slate-400 dark:text-slate-500")}>{item.item}</span>
                      <span className="text-xs text-slate-400">({item.qty})</span>
                      <Badge className={cn("text-[9px]", PRIORITY_STYLE[item.priority])}>{item.priority}</Badge>
                    </div>
                    {item.note && <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}