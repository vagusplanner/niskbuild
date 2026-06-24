import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Volume2, BookOpen, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const QURAN_API = 'https://api.alquran.cloud/v1';

export default function VerseDisplay({ 
  surahNumber, 
  fromVerse, 
  toVerse,
  onMarkMemorized,
  isMemorized = false,
  showTranslation = true,
  className
}) {
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hideArabic, setHideArabic] = useState(false);
  const [hideTranslation, setHideTranslation] = useState(false);
  const [memorizedVerses, setMemorizedVerses] = useState(new Set());

  useEffect(() => {
    fetchVerses();
  }, [surahNumber, fromVerse, toVerse]);

  const fetchVerses = async () => {
    setLoading(true);
    try {
      const promises = [];
      for (let i = fromVerse; i <= toVerse; i++) {
        promises.push(
          fetch(`${QURAN_API}/ayah/${surahNumber}:${i}/editions/quran-uthmani,en.sahih`).then(r => r.json())
        );
      }
      
      const results = await Promise.all(promises);
      const versesData = results.map(result => ({
        number: result.data[0].number,
        numberInSurah: result.data[0].numberInSurah,
        arabic: result.data[0].text,
        translation: result.data[1].text
      }));
      
      setVerses(versesData);
    } catch (error) {
      console.error('Failed to fetch verses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerseMemorization = (verseNumber) => {
    const newMemorized = new Set(memorizedVerses);
    if (newMemorized.has(verseNumber)) {
      newMemorized.delete(verseNumber);
    } else {
      newMemorized.add(verseNumber);
    }
    setMemorizedVerses(newMemorized);

    // Check if all verses are memorized
    if (newMemorized.size === verses.length) {
      onMarkMemorized?.();
    }
  };

  const playAudio = async (surahNumber, verseNumber) => {
    try {
      const audio = new Audio(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${surahNumber}${verseNumber.toString().padStart(3, '0')}.mp3`);
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-6">
          <div className="h-24 bg-slate-200 rounded mb-4"></div>
          <div className="h-16 bg-slate-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const progressPercent = verses.length > 0 ? (memorizedVerses.size / verses.length) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              <div>
                <p className="font-semibold text-teal-900">
                  Verses {fromVerse}-{toVerse}
                </p>
                <p className="text-xs text-teal-600">
                  {memorizedVerses.size} / {verses.length} memorized
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHideArabic(!hideArabic)}
                className="border-teal-300"
              >
                {hideArabic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="ml-1">Arabic</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHideTranslation(!hideTranslation)}
                className="border-teal-300"
              >
                {hideTranslation ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="ml-1">Translation</span>
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verses */}
      <div className="space-y-3">
        <AnimatePresence>
          {verses.map((verse, index) => {
            const isVerseMemorized = memorizedVerses.has(verse.numberInSurah);
            
            return (
              <motion.div
                key={verse.number}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={cn(
                    "border-2 transition-all",
                    isVerseMemorized 
                      ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300" 
                      : "border-slate-200 hover:border-teal-300"
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      {/* Verse number badge */}
                      <div className="flex-shrink-0">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                            isVerseMemorized 
                              ? "bg-emerald-500 text-white border-emerald-600" 
                              : "bg-teal-100 text-teal-700 border-teal-300"
                          )}
                        >
                          {verse.numberInSurah}
                        </Badge>
                      </div>

                      <div className="flex-1 space-y-4">
                        {/* Arabic text */}
                        {!hideArabic && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-right"
                          >
                            <p 
                              className="text-2xl leading-loose font-arabic text-slate-800"
                              style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
                            >
                              {verse.arabic}
                            </p>
                          </motion.div>
                        )}

                        {/* Translation */}
                        {!hideTranslation && showTranslation && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-slate-600 leading-relaxed"
                          >
                            {verse.translation}
                          </motion.div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playAudio(surahNumber, verse.numberInSurah)}
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                          >
                            <Volume2 className="w-4 h-4 mr-1" />
                            Listen
                          </Button>
                          
                          <Button
                            size="sm"
                            variant={isVerseMemorized ? "default" : "outline"}
                            onClick={() => toggleVerseMemorization(verse.numberInSurah)}
                            className={cn(
                              isVerseMemorized 
                                ? "bg-emerald-600 hover:bg-emerald-700" 
                                : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            )}
                          >
                            {isVerseMemorized ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Memorized
                              </>
                            ) : (
                              <>
                                <Circle className="w-4 h-4 mr-1" />
                                Mark Memorized
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Complete section button */}
      {memorizedVerses.size === verses.length && verses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Button
            onClick={onMarkMemorized}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-6 text-lg shadow-lg"
          >
            <CheckCircle className="w-6 h-6 mr-2" />
            Complete Section & Earn Points 🎉
          </Button>
        </motion.div>
      )}
    </div>
  );
}