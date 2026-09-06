/**
 * Canonical Islam Quran hub — Read / Practice / Progress.
 * Real text via Al-Quran Cloud (same source as DailyVerse). No placeholder ayahs.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen, Bookmark, ChevronLeft, ChevronRight, Loader2, Sparkles, X,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { SURAHS } from '@/components/quran/QURAN_DATA';
import { TRANSLATIONS, fetchSurah } from '@/lib/quran-api';
import QuranAudioPlayer from '@/components/islamic/QuranAudioPlayer';
import AITafsirPanel from '@/components/islamic/AITafsirPanel';
import QuranVoiceCheck from '@/components/islamic/unique/QuranVoiceCheck';
import QuranReadingTracker from '@/components/quran/QuranReadingTracker';
import QuranMemorizationTracker from '@/components/islamic/QuranMemorizationTracker';
import OfflineQuranViewer from '@/components/offline/OfflineQuranViewer';

const LAST_POS_KEY = 'vagus_quran_last_position_v1';

function loadLastPosition() {
  try {
    const raw = localStorage.getItem(LAST_POS_KEY);
    if (!raw) return { surah: 1, ayah: 1 };
    const parsed = JSON.parse(raw);
    return {
      surah: Math.min(114, Math.max(1, Number(parsed.surah) || 1)),
      ayah: Math.max(1, Number(parsed.ayah) || 1),
    };
  } catch {
    return { surah: 1, ayah: 1 };
  }
}

function ReadTab() {
  const saved = loadLastPosition();
  const [surahNumber, setSurahNumber] = useState(saved.surah);
  const [ayahNumber, setAyahNumber] = useState(saved.ayah);
  const [translationId, setTranslationId] = useState('en.asad');
  const [showExplain, setShowExplain] = useState(false);
  const queryClient = useQueryClient();

  const { data: surah, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['quran-surah', surahNumber, translationId],
    queryFn: () => fetchSurah(surahNumber, translationId),
    staleTime: 1000 * 60 * 60,
  });

  const ayahs = surah?.ayahs || [];
  const current = useMemo(
    () => ayahs.find((a) => a.numberInSurah === ayahNumber) || ayahs[0],
    [ayahs, ayahNumber]
  );

  // Clamp ayah when surah changes / loads
  useEffect(() => {
    if (!ayahs.length) return;
    if (ayahNumber > ayahs.length) setAyahNumber(1);
  }, [ayahs.length, ayahNumber]);

  useEffect(() => {
    localStorage.setItem(LAST_POS_KEY, JSON.stringify({ surah: surahNumber, ayah: ayahNumber }));
  }, [surahNumber, ayahNumber]);

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['quran-verse-bookmarks'],
    queryFn: () => base44.entities.QuranVerse.list('-created_date', 100).catch(() => []),
  });

  const isBookmarked = bookmarks.some(
    (b) => Number(b.surah_number) === surahNumber && Number(b.verse_number) === ayahNumber
  );

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error('No verse loaded');
      if (isBookmarked) {
        const existing = bookmarks.find(
          (b) => Number(b.surah_number) === surahNumber && Number(b.verse_number) === ayahNumber
        );
        if (existing?.id) await base44.entities.QuranVerse.delete(existing.id);
        return 'removed';
      }
      await base44.entities.QuranVerse.create({
        surah_number: surahNumber,
        surah_name: surah?.englishName || `Surah ${surahNumber}`,
        verse_number: ayahNumber,
        arabic_text: current.arabic,
        translation: current.translation,
        is_favorite: true,
      });
      return 'added';
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ['quran-verse-bookmarks'] });
      toast.success(action === 'removed' ? 'Bookmark removed' : 'Verse bookmarked');
    },
    onError: () => toast.error('Could not update bookmark'),
  });

  const goSurah = (n) => {
    setSurahNumber(Number(n));
    setAyahNumber(1);
    setShowExplain(false);
  };

  const meta = SURAHS.find((s) => s.number === surahNumber);

  return (
    <div className="space-y-4">
      <p className="text-xs rounded-xl p-2.5 font-medium" style={{ background: 'rgba(29,111,184,0.08)', color: '#1B2A4A', border: '1px solid rgba(29,111,184,0.15)' }}>
        Read any surah with real Arabic text and translation from Al-Quran Cloud, listen to the current ayah, bookmark verses, and open AI tafsir for the verse you’re on.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Surah</label>
          <Select value={String(surahNumber)} onValueChange={goSurah}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {SURAHS.map((s) => (
                <SelectItem key={s.number} value={String(s.number)}>
                  {s.number}. {s.name} ({s.verses})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Translation</label>
          <Select value={translationId} onValueChange={setTranslationId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSLATIONS.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(isLoading || isFetching) && !surah && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading surah from Al-Quran Cloud…
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-2">
          <p>Could not load Quran text: {error?.message || 'network error'}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {surah && current && (
        <>
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {surah.englishName}
                  {surah.name ? <span className="ml-2 text-emerald-800 font-normal" dir="rtl">{surah.name}</span> : null}
                </h3>
                <p className="text-xs text-slate-600">
                  {surah.englishNameTranslation || meta?.english} · {surah.numberOfAyahs} ayahs · {surah.revelationType}
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-white/80 px-2 py-1 rounded-lg border border-emerald-100">
                {surahNumber}:{current.numberInSurah}
              </span>
            </div>

            <p
              className="text-right text-2xl leading-[2.2] text-slate-900 font-arabic"
              dir="rtl"
              lang="ar"
              data-testid="quran-arabic-text"
            >
              {current.arabic}
            </p>

            <p className="text-sm text-slate-700 leading-relaxed" data-testid="quran-translation-text">
              {current.translation}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAyahNumber((n) => Math.max(1, n - 1))}
                disabled={ayahNumber <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAyahNumber((n) => Math.min(ayahs.length, n + 1))}
                disabled={ayahNumber >= ayahs.length}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bookmarkMutation.mutate()}
                disabled={bookmarkMutation.isPending}
                className={isBookmarked ? 'border-amber-400 text-amber-800 bg-amber-50' : ''}
              >
                <Bookmark className={`w-4 h-4 mr-1 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                {isBookmarked ? 'Saved' : 'Bookmark'}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowExplain((v) => !v)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {showExplain ? <X className="w-4 h-4 mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                {showExplain ? 'Close explain' : 'Explain'}
              </Button>
            </div>
          </div>

          <QuranAudioPlayer
            surah={surahNumber}
            ayah={current.numberInSurah}
            totalAyahs={ayahs.length}
            globalAyah={current.globalNumber}
            onAyahChange={(n) => setAyahNumber(n)}
          />

          {showExplain && (
            <AITafsirPanel
              initialSurah={surahNumber}
              initialVerse={current.numberInSurah}
              compact
            />
          )}

          {/* Verse list for the surah */}
          <div className="rounded-xl border border-slate-200 bg-white max-h-64 overflow-y-auto divide-y">
            {ayahs.map((a) => (
              <button
                key={a.numberInSurah}
                type="button"
                onClick={() => { setAyahNumber(a.numberInSurah); setShowExplain(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  a.numberInSurah === ayahNumber
                    ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                <span className="text-[10px] font-bold text-emerald-700 mr-2">{a.numberInSurah}</span>
                <span className="text-slate-600 line-clamp-1" dir="rtl">{a.arabic}</span>
              </button>
            ))}
          </div>

          {bookmarks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Bookmarks</h4>
              <div className="flex flex-wrap gap-2">
                {bookmarks.slice(0, 12).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSurahNumber(Number(b.surah_number) || 1);
                      setAyahNumber(Number(b.verse_number) || 1);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  >
                    {b.surah_name || b.surah_number}:{b.verse_number}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs rounded-xl p-2.5 font-medium" style={{ background: 'rgba(29,111,184,0.08)', color: '#1B2A4A', border: '1px solid rgba(29,111,184,0.15)' }}>
        Recite into your microphone and get an AI Tajweed accuracy score. Successful checks also appear under Progress → Memorisation.
      </p>
      <QuranVoiceCheck />
    </div>
  );
}

function ProgressTab() {
  const [mode, setMode] = useState('reading'); // reading | memorize | offline

  const MODES = [
    { id: 'reading', label: 'Reading', hint: 'Log · streak · khatmah · goals' },
    { id: 'memorize', label: 'Memorize', hint: 'Hifz list · Voice Check scores' },
    { id: 'offline', label: 'Offline', hint: 'Download surahs for offline' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs rounded-xl p-2.5 font-medium" style={{ background: 'rgba(29,111,184,0.08)', color: '#1B2A4A', border: '1px solid rgba(29,111,184,0.15)' }}>
        One place for progress: track reading, manage memorisation, or download for offline — pick a mode below.
      </p>

      {/* Single mode switch — not nested tabs inside each tool */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(212,224,236,0.35)', border: '1px solid rgba(74,110,138,0.25)' }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`flex-1 rounded-lg px-2 py-2.5 text-center transition-all ${
              mode === m.id
                ? 'bg-white shadow text-[#0D4F6C] font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="block text-xs">{m.label}</span>
            <span className={`block text-[9px] mt-0.5 font-medium ${mode === m.id ? 'text-slate-500' : 'text-slate-400'}`}>
              {m.hint}
            </span>
          </button>
        ))}
      </div>

      {mode === 'reading' && <QuranReadingTracker flat />}
      {mode === 'memorize' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Includes sections you add here and scores saved from Practice → Voice Check.
          </p>
          <QuranMemorizationTracker flat />
        </div>
      )}
      {mode === 'offline' && <OfflineQuranViewer embedded />}
    </div>
  );
}

export default function QuranHub({ initialTab = 'read' }) {
  const [tab, setTab] = useState(['read', 'practice', 'progress'].includes(initialTab) ? initialTab : 'read');

  return (
    <div className="space-y-1">
      <p className="text-xs mb-3 font-medium" style={{ color: '#2D4A65' }}>
        Read real Quran text with audio, practice Tajweed, and track reading progress & memorisation — in one place.
      </p>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full h-auto mb-4">
          <TabsTrigger value="read" className="text-[11px] py-2">📖 Read</TabsTrigger>
          <TabsTrigger value="practice" className="text-[11px] py-2">🎙️ Practice</TabsTrigger>
          <TabsTrigger value="progress" className="text-[11px] py-2">📈 Progress</TabsTrigger>
        </TabsList>
        <TabsContent value="read"><ReadTab /></TabsContent>
        <TabsContent value="practice"><PracticeTab /></TabsContent>
        <TabsContent value="progress"><ProgressTab /></TabsContent>
      </Tabs>
    </div>
  );
}
