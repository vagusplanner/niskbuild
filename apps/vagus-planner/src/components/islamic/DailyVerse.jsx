import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, Heart, Star, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import QuranReader from './QuranReader';

export default function DailyVerse({ compact = false }) {
  const { t } = useTranslation();
  const lang = typeof localStorage !== 'undefined' ? (localStorage.getItem('vagus_language') || 'en') : 'en';
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsir, setTafsir] = useState(null);
  const [loadingTafsir, setLoadingTafsir] = useState(false);
  const [aiContext, setAiContext] = useState(null);

  const fetchDailyVerse = async () => {
    try {
      setRefreshing(true);
      const today = format(new Date(), 'yyyy-MM-dd');

      // Check cache first
      const cached = sessionStorage.getItem('daily_verse_' + today);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setVerse(parsed.verse);
          setAiContext(parsed.ai_context || null);
          return;
        } catch (_) {}
      }

      // Deterministic verse by day-of-year: cycle through 114 surahs
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      const surahNum = (dayOfYear % 114) + 1;

      // Fetch from open Quran API (no auth needed)
      const [arabicRes, translationRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ar.alafasy`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/en.asad`),
      ]);

      if (!arabicRes.ok || !translationRes.ok) throw new Error('API unavailable');

      const arabicData = await arabicRes.json();
      const translationData = await translationRes.json();

      const ayahs = arabicData?.data?.ayahs || [];
      const transAyahs = translationData?.data?.ayahs || [];
      const surahName = arabicData?.data?.englishName || `Surah ${surahNum}`;

      // Pick a specific verse deterministically
      const verseIndex = dayOfYear % Math.max(ayahs.length, 1);
      const arabicAyah = ayahs[verseIndex] || ayahs[0];
      const transAyah = transAyahs[verseIndex] || transAyahs[0];

      const verseObj = {
        id: `${surahNum}-${arabicAyah?.numberInSurah}`,
        arabic_text: arabicAyah?.text || '',
        translation: transAyah?.text || '',
        surah_name: surahName,
        surah_number: surahNum,
        verse_number: arabicAyah?.numberInSurah || 1,
        is_favorite: false,
      };

      sessionStorage.setItem('daily_verse_' + today, JSON.stringify({ verse: verseObj, ai_context: null }));
      setVerse(verseObj);
      setAiContext(null);
    } catch (error) {
      console.error('Error fetching verse:', error);
      // Hardcoded fallback — Al-Fatiha
      setVerse({
        id: 'fallback',
        arabic_text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        translation: 'In the name of Allah, the Most Gracious, the Most Merciful.',
        surah_name: 'Al-Fatiha',
        surah_number: 1,
        verse_number: 1,
        is_favorite: false,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDailyVerse();
  }, []);

  const toggleFavorite = async () => {
    if (!verse) return;
    
    try {
      await base44.entities.QuranVerse.update(verse.id, {
        is_favorite: !verse.is_favorite
      });
      setVerse({ ...verse, is_favorite: !verse.is_favorite });
      toast.success(verse.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Could not update favorite status');
    }
  };

  const fetchTafsir = async () => {
    if (!verse || tafsir) return;
    
    setLoadingTafsir(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide a brief, clear explanation (tafsir) of this Quran verse in 2-3 sentences. Focus on the core message and practical application.

Verse: ${verse.translation}
Reference: Surah ${verse.surah_name}, Verse ${verse.verse_number}

Keep the explanation accessible and meaningful for daily reflection.`,
        add_context_from_internet: false
      });
      
      setTafsir(response);
      setShowTafsir(true);
    } catch (error) {
      toast.error('Failed to load tafsir');
    } finally {
      setLoadingTafsir(false);
    }
  };

  if (loading) {
    return (
      <Card className={`${compact ? 'p-4' : 'p-6'} bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200`}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-teal-700">{t('common.loading')}</span>
        </div>
      </Card>
    );
  }

  if (!verse) return null;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-5 border border-teal-200"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-teal-800">{t('islamic.verseOfDay')}</span>
          </div>
          <button
            onClick={toggleFavorite}
            className="p-1 rounded-lg hover:bg-white/50 transition-colors"
          >
            <Heart 
              className={`w-4 h-4 ${verse.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} 
            />
          </button>
        </div>
        
        <p className="text-right text-xl leading-relaxed mb-3 font-arabic text-teal-900" dir="rtl">
          {verse.arabic_text}
        </p>
        
        <p className="text-sm text-slate-600 mb-2">
          {verse.translation}
        </p>
        
        <p className="text-xs text-teal-600 font-medium">
          {verse.surah_name} {verse.verse_number}
        </p>
      </motion.div>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 border-teal-200 shadow-lg relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-200/20 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-200/20 rounded-full -ml-12 -mb-12" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">{t('islamic.verseOfDay')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
              className={`h-8 w-8 ${verse.is_favorite ? 'text-rose-500' : 'text-slate-400'}`}
            >
              <Heart 
                className={`w-4 h-4 ${verse.is_favorite ? 'fill-rose-500' : ''}`} 
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchDailyVerse}
              disabled={refreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={verse.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Arabic Text */}
            <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl">
              <p className="text-right text-2xl leading-loose font-arabic text-emerald-900" dir="rtl">
                {verse.arabic_text}
              </p>
            </div>

            {/* Transliteration */}
            {verse.transliteration && (
              <div className="mb-4 p-3 bg-white/40 rounded-lg">
                <p className="text-sm text-slate-600 italic">
                  {verse.transliteration}
                </p>
              </div>
            )}

            {/* Translation */}
            <div className="mb-4">
              <p className="text-slate-700 leading-relaxed">
                {verse.translation}
              </p>
            </div>

            {/* AI Context */}
            {aiContext && (
              <div className="space-y-3 mb-4">
                {aiContext.context && (
                  <div className="p-3 bg-teal-50 rounded-lg">
                    <p className="text-xs font-semibold text-teal-900 mb-1">📚 {t('islamic.reflection')}</p>
                    <p className="text-sm text-teal-800">{aiContext.context}</p>
                  </div>
                )}
                
                {aiContext.key_lessons && aiContext.key_lessons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">{t('islamic.keyLessons')}</p>
                    <ul className="space-y-1">
                      {aiContext.key_lessons.map((lesson, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-teal-600 flex-shrink-0">•</span>
                          <span>{lesson}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiContext.reflection_prompts && aiContext.reflection_prompts.length > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs font-semibold text-purple-900 mb-2">💭 {t('islamic.reflectOn')}</p>
                    {aiContext.reflection_prompts.map((prompt, idx) => (
                      <p key={idx} className="text-sm text-purple-700 mb-1">• {prompt}</p>
                    ))}
                  </div>
                )}

                {aiContext.practical_application && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs font-semibold text-emerald-900 mb-1">✨ {t('islamic.applyToday')}</p>
                    <p className="text-sm text-emerald-700">{aiContext.practical_application}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reference */}
            <div className="flex items-center justify-between pt-4 border-t border-emerald-200">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">
                  {lang === 'ar' ? `سورة ${verse.surah_name}، آية ${verse.verse_number}` : `Surah ${verse.surah_name}, Verse ${verse.verse_number}`}
                </span>
              </div>
              {verse.surah_number && (
                <span className="text-xs text-emerald-600 bg-white/50 px-2 py-1 rounded-full">
                  {verse.surah_number}:{verse.verse_number}
                </span>
              )}
            </div>

            {/* Tafsir Section */}
            {showTafsir && tafsir && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1">
                  📖 {t('islamic.briefExplanation')}
                </h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {tafsir}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button
                onClick={() => setShowReader(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {t('common.view')}
              </Button>
              <Button
                onClick={fetchTafsir}
                disabled={loadingTafsir || showTafsir}
                variant="outline"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                {loadingTafsir ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Star className="w-4 h-4 mr-2" />
                )}
                {showTafsir ? t('common.done') : (lang === 'ar' ? 'تفسير' : 'Tafsir')}
              </Button>
            </div>
            
            <Button
              onClick={() => window.open('https://quranly.com', '_blank')}
              variant="outline"
              className="w-full mt-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('islamic.openQuranly')}
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>

      {showReader && (
        <QuranReader
          initialSurah={verse.surah_number}
          initialVerse={verse.verse_number}
          onClose={() => setShowReader(false)}
        />
      )}
    </Card>
  );
}