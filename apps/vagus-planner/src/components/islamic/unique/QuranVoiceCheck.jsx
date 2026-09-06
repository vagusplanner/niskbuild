import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, BookOpen, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { SURAHS } from '@/components/quran/QURAN_DATA';
import { fetchSurah, getAyahAudioUrl } from '@/lib/quran-api';

const QUICK_PICKS = [1, 36, 67, 112, 113, 114];

/**
 * Tajweed voice practice for any of the 114 surahs.
 * Loads real Arabic from Al-Quran Cloud; practice one ayah at a time (full-surah mic for Baqarah etc. is impractical).
 */
function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function QuranVoiceCheck() {
  const queryClient = useQueryClient();
  const [surahNumber, setSurahNumber] = useState(1);
  const [ayahNumber, setAyahNumber] = useState(1);
  const [surahData, setSurahData] = useState(null);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(null); // null until mount
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const meta = useMemo(() => SURAHS.find((s) => s.number === surahNumber), [surahNumber]);
  const currentAyah = surahData?.ayahs?.find((a) => a.numberInSurah === ayahNumber) || surahData?.ayahs?.[0];

  useEffect(() => {
    // Genuine Web Speech API gap (not a false-negative): Chrome/Edge desktop OK;
    // Firefox has no SpeechRecognition; Safari/iOS often missing or unreliable
    // (iOS Chrome uses WebKit, so same limitation).
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSurah(true);
      setResult(null);
      setTranscript('');
      try {
        const data = await fetchSurah(surahNumber, 'en.asad');
        if (cancelled) return;
        setSurahData(data);
        setAyahNumber(1);
      } catch {
        if (!cancelled) {
          toast.error('Could not load surah text');
          setSurahData(null);
        }
      } finally {
        if (!cancelled) setLoadingSurah(false);
      }
    })();
    return () => { cancelled = true; };
  }, [surahNumber]);

  const toggleRecording = () => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      toast.error('Voice practice works best in Chrome or Edge on desktop. Type your recitation below instead.');
      return;
    }

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    setTranscript('');
    setResult(null);
    const r = new SR();
    r.lang = 'ar-SA';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join(' ');
      setTranscript(t);
    };
    r.onend = () => { setRecording(false); };
    r.onerror = (e) => {
      if (e.error === 'language-not-supported') {
        const r2 = new SR();
        r2.lang = 'en-US';
        r2.continuous = true;
        r2.interimResults = true;
        r2.onresult = (e2) => { setTranscript(Array.from(e2.results).map((x) => x[0].transcript).join(' ')); };
        r2.onend = () => setRecording(false);
        r2.start();
        recognitionRef.current = r2;
        return;
      }
      setRecording(false);
      if (e.error === 'not-allowed') {
        toast.error('Microphone permission denied. Allow mic access, or type your recitation below.');
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        toast.error('Voice recognition failed. Try Chrome or Edge, or type your recitation below.');
      }
    };
    try {
      r.start();
      recognitionRef.current = r;
      setRecording(true);
      toast.success('Reciting in Arabic — tap stop when done');
    } catch {
      setRecording(false);
      toast.error('Could not start voice recognition. Type your recitation below instead.');
    }
  };

  const checkTajweed = async () => {
    if (!transcript.trim()) return toast.error('Please recite first');
    if (!currentAyah) return toast.error('Verse not loaded');
    setChecking(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert Quran teacher checking a student's recitation of Surah ${surahData.englishName} ayah ${currentAyah.numberInSurah}.

Expected Arabic: "${currentAyah.arabic}"
Expected meaning (English): "${currentAyah.translation}"

Student's transcribed recitation: "${transcript}"

Note: Speech recognition may have transcribed Arabic sounds phonetically in English or partially in Arabic. Assess as best as possible.

Evaluate:
1. Accuracy (0-100 score)
2. Specific Tajweed rules they should focus on
3. Pronunciation mistakes detected
4. Words/phrases to re-practice
5. An encouraging message
6. Suggested next steps`,
        response_json_schema: {
          type: 'object',
          properties: {
            accuracy_score: { type: 'number' },
            tajweed_rules: { type: 'array', items: { type: 'string' } },
            mistakes: { type: 'array', items: { type: 'string' } },
            practice_words: { type: 'array', items: { type: 'string' } },
            encouragement: { type: 'string' },
            next_steps: { type: 'string' },
          }
        },
        model: 'claude_sonnet_4_6',
      });
      setResult(res);

      await base44.entities.QuranMemorization.create({
        surah_number: surahNumber,
        surah_name: surahData.englishName || meta?.name,
        ayah_from: currentAyah.numberInSurah,
        ayah_to: currentAyah.numberInSurah,
        from_verse: currentAyah.numberInSurah,
        to_verse: currentAyah.numberInSurah,
        status: res.accuracy_score >= 80 ? 'memorized' : 'memorizing',
        accuracy_score: res.accuracy_score,
        notes: `Voice check score: ${res.accuracy_score}/100 (ayah ${currentAyah.numberInSurah})`,
        last_reviewed: new Date().toISOString().split('T')[0],
      }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ['quran-memorizations'] });
      queryClient.invalidateQueries({ queryKey: ['quranMemorization'] });
    } catch (_) {
      toast.error('AI check failed. Please try again.');
    }
    setChecking(false);
  };

  const playAudio = () => {
    if (!currentAyah?.globalNumber) return toast.error('Verse audio not ready');
    const url = getAyahAudioUrl('ar.alafasy', currentAyah.globalNumber);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.play().catch(() => toast.error('Could not play audio'));
    } else {
      const a = new Audio(url);
      a.play().catch(() => toast.error('Could not play audio'));
      audioRef.current = a;
    }
    toast.success('Playing Mishary Alafasy');
  };

  const scoreBg = (s) => (s >= 80 ? 'from-emerald-400 to-teal-500' : s >= 60 ? 'from-amber-400 to-orange-500' : 'from-red-400 to-rose-500');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-emerald-600" />
        <h3 className="font-black text-slate-800 dark:text-slate-100">Quran Voice Check — Tajweed AI</h3>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-2.5">
        All 114 surahs are available. Practice one ayah at a time (browser speech recognition works best on short passages).
      </p>

      {speechSupported === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 p-3 space-y-1">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Voice practice unavailable in this browser</p>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
            The Web Speech API is not available here. Voice works best in <strong>Chrome or Edge on desktop</strong>.
            Safari, Firefox, and most iOS browsers (including Chrome on iPhone) often lack support.
            You can still practice by typing your recitation below.
          </p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {QUICK_PICKS.map((n) => {
          const s = SURAHS.find((x) => x.number === n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => setSurahNumber(n)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                surahNumber === n ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400'
              }`}
            >
              {s?.name || n}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Surah (1–114)</label>
          <Select value={String(surahNumber)} onValueChange={(v) => setSurahNumber(Number(v))}>
            <SelectTrigger className="h-9">
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
          <label className="text-[10px] font-bold text-slate-500 uppercase">Ayah to practice</label>
          <Select
            value={String(ayahNumber)}
            onValueChange={(v) => { setAyahNumber(Number(v)); setResult(null); setTranscript(''); }}
            disabled={!surahData}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {(surahData?.ayahs || []).map((a) => (
                <SelectItem key={a.numberInSurah} value={String(a.numberInSurah)}>
                  Ayah {a.numberInSurah}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-5 text-center min-h-[120px]">
        {loadingSurah && (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-6">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading ayah…
          </div>
        )}
        {!loadingSurah && currentAyah && (
          <>
            <p className="text-[10px] font-bold text-emerald-700 mb-2">
              {surahData.englishName} · {surahNumber}:{currentAyah.numberInSurah}
            </p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 leading-relaxed mb-2" dir="rtl" lang="ar" style={{ fontFamily: 'Amiri, serif' }}>
              {currentAyah.arabic}
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/70">{currentAyah.translation}</p>
            <button
              type="button"
              onClick={playAudio}
              className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" /> Listen First
            </button>
          </>
        )}
      </div>

      {speechSupported !== false && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleRecording}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-md ${recording ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 hover:bg-emerald-600'}`}
          >
            {recording ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{recording ? 'Reciting — tap to stop' : 'Tap mic to begin reciting'}</p>
            {transcript && <p className="text-xs text-slate-400 mt-0.5 italic line-clamp-2">{transcript}</p>}
          </div>
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase">
          {speechSupported === false ? 'Type your recitation' : 'Or type / edit transcript'}
        </label>
        <textarea
          value={transcript}
          onChange={(e) => { setTranscript(e.target.value); setResult(null); }}
          rows={3}
          dir="auto"
          placeholder={speechSupported === false
            ? 'Type the ayah in Arabic or phonetically in English…'
            : 'Optional: edit what the mic heard, or type instead…'}
          className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      {transcript.trim() && !recording && (
        <Button onClick={checkTajweed} disabled={checking} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:opacity-90">
          {checking ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Checking Tajweed...</> : 'Check My Recitation with AI'}
        </Button>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${scoreBg(result.accuracy_score)} flex items-center justify-center flex-shrink-0`}>
                <span className="text-2xl font-black text-white">{result.accuracy_score}</span>
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-800 dark:text-slate-100 text-sm">Accuracy Score</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{result.encouragement}</p>
              </div>
            </div>

            {result.tajweed_rules?.length > 0 && (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200/60 dark:border-blue-800/40">
                <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase mb-2">Tajweed Rules to Practice</p>
                {result.tajweed_rules.map((r, i) => <p key={i} className="text-xs text-slate-600 dark:text-slate-400 py-0.5">• {r}</p>)}
              </div>
            )}

            {result.mistakes?.length > 0 && (
              <div className="p-3.5 bg-red-50 dark:bg-red-900/15 rounded-xl border border-red-200/60 dark:border-red-800/30">
                <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase mb-2">Areas to Improve</p>
                {result.mistakes.map((m, i) => <p key={i} className="text-xs text-slate-600 dark:text-slate-400 py-0.5">• {m}</p>)}
              </div>
            )}

            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/15 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">→ {result.next_steps}</p>
            </div>

            <Button variant="outline" onClick={() => { setResult(null); setTranscript(''); }} className="w-full">Try Again</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
