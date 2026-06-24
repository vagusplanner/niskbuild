import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, RefreshCw, Heart, Loader2, ChevronDown, ChevronUp, Share2, Mail, Copy, Twitter, Facebook } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SDK } from '@/lib/custom-sdk.js';

// Hadith collections available via hadith-api (sunnah.com)
const COLLECTIONS = [
  { key: 'bukhari', label: 'Sahih Al-Bukhari', maxHadith: 7563 },
  { key: 'muslim', label: 'Sahih Muslim', maxHadith: 7453 },
  { key: 'abudawud', label: 'Abu Dawud', maxHadith: 5274 },
  { key: 'tirmidhi', label: 'Al-Tirmidhi', maxHadith: 3956 },
  { key: 'ibnmajah', label: 'Ibn Majah', maxHadith: 4341 },
];

function todaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRandom(seed, max) {
  // Simple LCG seeded random
  let x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * max) + 1;
}

export default function DailyHadithWidget() {
  const [collectionKey, setCollectionKey] = useState('bukhari');
  const [showArabic, setShowArabic] = useState(false);
  const queryClient = useQueryClient();

  const collection = COLLECTIONS.find(c => c.key === collectionKey) || COLLECTIONS[0];
  const hadithNum = seededRandom(todaySeed() + collection.key.charCodeAt(0), collection.maxHadith);

  const { data: hadith, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dailyHadith', collectionKey, hadithNum],
    queryFn: async () => {
      // Try the Hadith API (CDN-hosted, no key needed)
      try {
        const res = await fetch(
          `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${collectionKey}/${hadithNum}.json`
        );
        if (res.ok) {
          const json = await res.json();
          if (json?.hadith?.text) {
            return { _cdnGenerated: true, english_translation: json.hadith.text, hadithNumber: hadithNum };
          }
        }
      } catch (_) {}
      // Fallback: AI-generated hadith content
      const aiResult = await SDK.integrations.Core.InvokeLLM({
        prompt: `Give me one authentic, well-known hadith from ${collection.label} (hadith number around ${hadithNum}). Return JSON with: english_translation (full text of hadith in English), arabic_text (Arabic text), narrator (narrator name e.g. Abu Hurairah), hadithNumber (number), grade (e.g. Sahih).`,
        response_json_schema: {
          type: 'object',
          properties: {
            english_translation: { type: 'string' },
            arabic_text: { type: 'string' },
            narrator: { type: 'string' },
            hadithNumber: { type: 'number' },
            grade: { type: 'string' },
          }
        }
      });
      return { _aiGenerated: true, ...aiResult };
    },
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
  });

  const fallbackHadith = null;
  const fallbackLoading = false;

  // Save to DB favorites
  const { data: savedHadiths = [] } = useQuery({
    queryKey: ['hadiths'],
    queryFn: () => SDK.entities.Hadith.list('-created_date', 100),
  });

  const saveMutation = useMutation({
    mutationFn: (h) => SDK.entities.Hadith.create({
      english_translation: h.english || h.text,
      arabic_text: h.arabic || '',
      source: `${collection.label}`,
      reference: h.reference || `Hadith #${h.hadithNumber || hadithNum}`,
      narrator: h.narrator || '',
      is_favorite: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hadiths'] });
      toast.success('Hadith saved to your collection ❤️');
    },
  });

  const displayHadith = hadith || fallbackHadith;
  const loading = isLoading || (isError && fallbackLoading);

  const handleShare = (method) => {
    const text = englishText || '';
    const source = `${collection.label}${displayHadith?.hadithNumber ? ` #${displayHadith.hadithNumber}` : ''}`;
    const shareText = `📖 Hadith of the Day (${source}):\n\n"${text}"\n\n— Shared via Vagus Planner`;

    if (method === 'copy') {
      navigator.clipboard.writeText(shareText);
      toast.success('Copied to clipboard!');
    } else if (method === 'email') {
      window.open(`mailto:?subject=Hadith of the Day&body=${encodeURIComponent(shareText)}`);
    } else if (method === 'twitter') {
      const tweet = `📖 "${text.slice(0, 200)}..." — ${source}`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank');
    } else if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (method === 'native' && navigator.share) {
      navigator.share({ title: 'Hadith of the Day', text: shareText });
    }
  };

  const handleSave = () => {
    if (!displayHadith) return;
    const text = displayHadith.hadith?.[0]?.body || displayHadith.text || displayHadith.english_translation;
    const arabic = displayHadith.hadith?.[0]?.arabic || displayHadith.arabic || '';
    const reference = displayHadith.hadithNumber ? `${collection.label} #${displayHadith.hadithNumber}` : `${collection.label} #${hadithNum}`;
    saveMutation.mutate({ english: text, arabic, reference });
  };

  const englishText = displayHadith?.hadith?.[0]?.body
    || displayHadith?.text
    || displayHadith?.english_translation
    || '';
  const arabicText = displayHadith?.hadith?.[0]?.arabic
    || displayHadith?.arabic
    || displayHadith?.arabic_text
    || '';
  const narrator = displayHadith?.hadith?.[0]?.grades?.[0]?.grade
    || displayHadith?.narrator
    || displayHadith?.grade
    || '';

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
              <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-100">Hadith of the Day</h3>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">From {collection.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 text-amber-600 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave} disabled={saveMutation.isPending || !displayHadith}>
              <Heart className={`w-4 h-4 ${saveMutation.isSuccess ? 'fill-rose-500 text-rose-500' : 'text-amber-600'}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!displayHadith}>
                  <Share2 className="w-4 h-4 text-amber-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleShare('copy')}>
                  <Copy className="w-4 h-4 mr-2" /> Copy text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('email')}>
                  <Mail className="w-4 h-4 mr-2" /> Send by email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                  <Share2 className="w-4 h-4 mr-2" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('twitter')}>
                  <Twitter className="w-4 h-4 mr-2" /> Twitter / X
                </DropdownMenuItem>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <DropdownMenuItem onClick={() => handleShare('native')}>
                    <Share2 className="w-4 h-4 mr-2" /> More options…
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Collection selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 hide-scrollbar">
          {COLLECTIONS.map(c => (
            <button
              key={c.key}
              onClick={() => setCollectionKey(c.key)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                collectionKey === c.key
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-amber-200 dark:border-amber-800 hover:border-amber-400'
              }`}
            >
              {c.label.split(' ').slice(-1)[0]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : !displayHadith ? (
          <div className="text-center py-6">
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">Could not load hadith. Check your connection.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-amber-300 text-amber-700 dark:text-amber-300">
              Try Again
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={collectionKey + (displayHadith.hadithNumber || '')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {arabicText && (
                <div>
                  <button
                    className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mb-1.5"
                    onClick={() => setShowArabic(v => !v)}
                  >
                    {showArabic ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showArabic ? 'Hide Arabic' : 'Show Arabic'}
                  </button>
                  <AnimatePresence>
                    {showArabic && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 bg-white/60 dark:bg-slate-800/50 rounded-xl mb-2">
                          <p className="text-xl leading-loose text-amber-900 dark:text-amber-100 text-right" dir="rtl" lang="ar"
                            style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: '2.2' }}>
                            {arabicText}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="p-4 bg-white/50 dark:bg-slate-800/40 rounded-xl">
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {englishText || 'No English translation available.'}
                </p>
              </div>

              {narrator && (
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium px-1">Grade: {narrator}</p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-amber-200 dark:border-amber-800">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{collection.label}</span>
                {displayHadith.hadithNumber && (
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    #{displayHadith.hadithNumber}
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Card>
  );
}