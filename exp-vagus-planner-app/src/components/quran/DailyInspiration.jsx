import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, RefreshCw, Heart, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { HADITH_DB } from './QURAN_DATA';

// Pick a deterministic hadith based on the day of year
function getDailyHadith() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return HADITH_DB[dayOfYear % HADITH_DB.length];
}

export default function DailyInspiration({ compact = false }) {
  const [mode, setMode] = useState('hadith'); // 'hadith' | 'verse'
  const [verse, setVerse] = useState(null);
  const [loadingVerse, setLoadingVerse] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const hadith = getDailyHadith();

  const fetchVerse = async () => {
    setLoadingVerse(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const existing = await SDK.entities.QuranVerse.filter({ date: today });
      if (existing.length > 0) {
        setVerse(existing[0]);
      } else {
        const result = await SDK.functions.invoke('generateDailyQuranVerse', { date: today });
        setVerse(result.data?.verse || null);
      }
    } catch {
      toast.error('Could not load verse');
    } finally {
      setLoadingVerse(false);
    }
  };

  useEffect(() => {
    if (mode === 'verse' && !verse) fetchVerse();
  }, [mode]);

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">Daily Inspiration</span>
            </div>
            <div className="flex gap-1">
              {['hadith', 'verse'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-2 py-0.5 text-xs rounded-full transition-all ${mode === m ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 border border-emerald-200'}`}>
                  {m === 'hadith' ? 'Hadith' : 'Verse'}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'hadith' ? (
              <motion.div key="hadith" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-sm text-slate-700 italic line-clamp-3">"{hadith.english}"</p>
                <p className="text-xs text-emerald-600 mt-1">— {hadith.narrator} · {hadith.source}</p>
              </motion.div>
            ) : (
              <motion.div key="verse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {loadingVerse ? (
                  <p className="text-sm text-slate-400 animate-pulse">Loading verse...</p>
                ) : verse ? (
                  <>
                    <p className="text-right text-base leading-relaxed text-slate-800 mb-2" dir="rtl">{verse.arabic_text}</p>
                    <p className="text-sm text-slate-700 italic line-clamp-2">"{verse.translation}"</p>
                    <p className="text-xs text-emerald-600 mt-1">{verse.surah_name} {verse.verse_number}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">No verse available</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200 shadow-md overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-200/20 rounded-full -mr-12 -mt-12 pointer-events-none" />
      <CardContent className="p-5 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-emerald-900">Daily Inspiration</h3>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex gap-1 p-1 bg-white/60 rounded-lg">
              {[['hadith', 'Hadith'], ['verse', 'Verse']].map(([m, l]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === m ? 'bg-emerald-600 text-white shadow' : 'text-emerald-700 hover:bg-white'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'hadith' ? (
            <motion.div key="hadith-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="p-4 bg-white/60 rounded-xl mb-3">
                <p className="text-right text-xl leading-relaxed text-slate-800 mb-3" dir="rtl">{hadith.arabic}</p>
                <p className="text-slate-700 leading-relaxed italic">"{hadith.english}"</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">— {hadith.narrator}</p>
                  <p className="text-xs text-emerald-600">{hadith.source} · {hadith.reference}</p>
                </div>
                <div className="flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-full">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-xs text-emerald-700 capitalize">{hadith.category}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="verse-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {loadingVerse ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Loading verse...</p>
                </div>
              ) : verse ? (
                <>
                  <div className="p-4 bg-white/60 rounded-xl mb-3">
                    <p className="text-right text-2xl leading-loose text-slate-800 mb-3" dir="rtl">{verse.arabic_text}</p>
                    <p className="text-slate-700 leading-relaxed italic">"{verse.translation}"</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Surah {verse.surah_name}, Verse {verse.verse_number}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchVerse} className="gap-1 text-emerald-700">
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Button onClick={fetchVerse} variant="outline" className="border-emerald-300 text-emerald-700">Load Today's Verse</Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}