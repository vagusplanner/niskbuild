/**
 * Arabic Keyboard Helper — floating toolbar for Arabic input.
 * Provides:
 *  1. Diacritics (Tashkeel) one-tap insertion
 *  2. Common Islamic phrases quick-insert
 *  3. Arabic numeral toggle
 *  4. Works with any focused <input> or <textarea>
 *  5. Only shows when language is AR or when user explicitly opens it
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const DIACRITICS = [
  { char: 'َ', name: 'Fatha', label: 'فَ' },
  { char: 'ً', name: 'Tanwin Fath', label: 'فً' },
  { char: 'ِ', name: 'Kasra', label: 'فِ' },
  { char: 'ٍ', name: 'Tanwin Kasr', label: 'فٍ' },
  { char: 'ُ', name: 'Damma', label: 'فُ' },
  { char: 'ٌ', name: 'Tanwin Damm', label: 'فٌ' },
  { char: 'ْ', name: 'Sukoon', label: 'فْ' },
  { char: 'ّ', name: 'Shadda', label: 'فّ' },
  { char: 'ـ', name: 'Tatweel', label: 'ـ' },
  { char: 'ء', name: 'Hamza', label: 'ء' },
  { char: 'ٰ', name: 'Superscript Alef', label: 'ٰ' },
];

const ISLAMIC_PHRASES = [
  { ar: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', label: 'Bismillah' },
  { ar: 'الْحَمْدُ لِلَّهِ', label: 'Alhamdulillah' },
  { ar: 'سُبْحَانَ اللَّهِ', label: 'SubhanAllah' },
  { ar: 'اللَّهُ أَكْبَرُ', label: 'Allahu Akbar' },
  { ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ', label: 'La ilaha' },
  { ar: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ', label: 'Inna lillah' },
  { ar: 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ', label: 'PBUH' },
  { ar: 'رَضِيَ اللَّهُ عَنْهُ', label: 'RA (male)' },
  { ar: 'رَضِيَ اللَّهُ عَنْهَا', label: 'RA (female)' },
  { ar: 'جَزَاكَ اللَّهُ خَيْرًا', label: 'JazakAllah' },
  { ar: 'مَاشَاءَ اللَّهُ', label: 'MashaAllah' },
  { ar: 'إِنْ شَاءَ اللَّهُ', label: 'InshaAllah' },
];

const ARABIC_LETTERS = [
  'ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط',
  'ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي','أ','إ','آ','ة','ى'
];

function insertAtCursor(el, text) {
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const val = el.value;
  el.value = val.substring(0, start) + text + val.substring(end);
  el.selectionStart = el.selectionEnd = start + text.length;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus();
}

export default function ArabicKeyboardHelper() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('phrases'); // 'phrases' | 'diacritics' | 'letters'
  const [lastFocused, setLastFocused] = useState(null);

  const lang = localStorage.getItem('vagus_language') || 'en';
  const isArabic = lang === 'ar' || lang === 'ur';

  // Track last focused text input
  useEffect(() => {
    const onFocus = (e) => {
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.type !== 'checkbox') {
        setLastFocused(e.target);
      }
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, []);

  const insert = useCallback((text) => {
    insertAtCursor(lastFocused, text);
  }, [lastFocused]);

  // Only render in Arabic/Urdu mode or when explicitly triggered
  if (!isArabic) return null;

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-2 z-[47] lg:bottom-4 lg:left-4">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: '320px', maxHeight: '360px' }}
          >
            {/* Tabs */}
            <div className="flex bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              {[['phrases','العبارات'],['diacritics','التشكيل'],['letters','الحروف']].map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn('flex-1 py-2 text-xs font-bold transition-colors', tab === t ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
                  {label}
                </button>
              ))}
              <button onClick={() => setOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto" style={{ maxHeight: '280px' }}>
              {tab === 'phrases' && (
                <div className="grid grid-cols-2 gap-1.5">
                  {ISLAMIC_PHRASES.map(p => (
                    <button key={p.label} onClick={() => insert(p.ar)}
                      className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all text-right">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100" dir="rtl" style={{ fontFamily: "'Amiri', serif", fontSize: '13px' }}>
                        {p.ar.length > 20 ? p.ar.substring(0, 20) + '…' : p.ar}
                      </p>
                      <p className="text-[10px] text-slate-400 text-left">{p.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {tab === 'diacritics' && (
                <div className="grid grid-cols-4 gap-1.5">
                  {DIACRITICS.map(d => (
                    <button key={d.char} onClick={() => insert(d.char)}
                      title={d.name}
                      className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all text-center">
                      <span className="text-xl" style={{ fontFamily: "'Amiri', serif" }}>{d.label}</span>
                      <p className="text-[9px] text-slate-400 mt-0.5 truncate">{d.name}</p>
                    </button>
                  ))}
                </div>
              )}

              {tab === 'letters' && (
                <div className="grid grid-cols-6 gap-1">
                  {ARABIC_LETTERS.map(l => (
                    <button key={l} onClick={() => insert(l)}
                      className="p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-center text-xl transition-colors"
                      style={{ fontFamily: "'Amiri', serif" }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB toggle */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(!open)}
        className={cn(
          'w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all',
          open ? 'bg-slate-700 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200 dark:shadow-emerald-900'
        )}>
        {open ? <X className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
      </motion.button>
    </div>
  );
}