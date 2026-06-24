import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, BookOpen, CheckCircle2, AlertCircle, Star, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PRACTICE_SURAHS = [
  { id: 1,   name: 'Al-Fatiha',     ayahs: 7,  text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', transliteration: 'Bismillahi r-rahmani r-rahim' },
  { id: 112, name: 'Al-Ikhlas',     ayahs: 4,  text: 'قُلْ هُوَ اللَّهُ أَحَدٌ', transliteration: "Qul huwa Allahu ahad" },
  { id: 113, name: 'Al-Falaq',      ayahs: 5,  text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', transliteration: "Qul a'udhu bi rabbi l-falaq" },
  { id: 114, name: 'An-Nas',        ayahs: 6,  text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', transliteration: "Qul a'udhu bi rabbi n-nas" },
  { id: 2,   name: 'Al-Baqarah 1-5', ayahs: 5, text: 'الم ذَٰلِكَ الْكِتَابُ لَا رَيْبَ', transliteration: 'Alif lam mim. Thalika l-kitabu la rayba' },
];

export default function QuranVoiceCheck() {
  const [selected, setSelected] = useState(PRACTICE_SURAHS[0]);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const toggleRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice recognition not supported in your browser.'); return; }

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    setTranscript('');
    setResult(null);
    const r = new SR();
    r.lang = 'ar-SA'; // Arabic
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setTranscript(t);
    };
    r.onend = () => { setRecording(false); };
    r.onerror = (e) => {
      // Fallback to English if Arabic not available
      if (e.error === 'language-not-supported') {
        const r2 = new SR();
        r2.lang = 'en-US';
        r2.continuous = true;
        r2.interimResults = true;
        r2.onresult = (e2) => { setTranscript(Array.from(e2.results).map(r=>r[0].transcript).join(' ')); };
        r2.onend = () => setRecording(false);
        r2.start();
        recognitionRef.current = r2;
        return;
      }
      setRecording(false);
    };
    r.start();
    recognitionRef.current = r;
    setRecording(true);
    toast.success('🎙️ Reciting in Arabic — tap stop when done');
  };

  const checkTajweed = async () => {
    if (!transcript.trim()) return toast.error('Please recite first');
    setChecking(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert Quran teacher checking a student's recitation of Surah ${selected.name}.\n\nExpected text: "${selected.text}"\nExpected transliteration: "${selected.transliteration}"\n\nStudent's transcribed recitation: "${transcript}"\n\nNote: The speech recognition may have transcribed Arabic sounds phonetically in English or partially in Arabic. Assess the recitation as best as possible.\n\nEvaluate:\n1. Accuracy (0-100 score)\n2. Specific Tajweed rules they should focus on\n3. Pronunciation mistakes detected\n4. Words/phrases to re-practice\n5. An encouraging message\n6. Suggested next steps`,
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

      // Save progress to QuranMemorization entity
      await base44.entities.QuranMemorization.create({
        surah_number: selected.id,
        surah_name: selected.name,
        ayah_from: 1,
        ayah_to: selected.ayahs,
        status: res.accuracy_score >= 80 ? 'memorized' : 'in_progress',
        accuracy_score: res.accuracy_score,
        notes: `Voice check score: ${res.accuracy_score}/100`,
        last_reviewed: new Date().toISOString().split('T')[0],
      }).catch(() => {});

    } catch (_) { toast.error('AI check failed. Please try again.'); }
    setChecking(false);
  };

  const playAudio = () => {
    const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${selected.id}.mp3`;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = url; audioRef.current.play(); }
    else { const a = new Audio(url); a.play(); audioRef.current = a; }
    toast.success('▶️ Playing recitation by Mishary Alafasy');
  };

  const scoreColor = (s) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = (s) => s >= 80 ? 'from-emerald-400 to-teal-500' : s >= 60 ? 'from-amber-400 to-orange-500' : 'from-red-400 to-rose-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-emerald-600" />
        <h3 className="font-black text-slate-800 dark:text-slate-100">Quran Voice Check — Tajweed AI</h3>
      </div>

      {/* Surah selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {PRACTICE_SURAHS.map(s => (
          <button key={s.id} onClick={() => { setSelected(s); setResult(null); setTranscript(''); }}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              selected.id === s.id ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400'
            }`}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Arabic text display */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-5 text-center">
        <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 leading-relaxed mb-2" dir="rtl" style={{ fontFamily: 'Amiri, serif' }}>
          {selected.text}
        </p>
        <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 italic">{selected.transliteration}</p>
        <button onClick={playAudio}
          className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-all">
          <Volume2 className="w-3.5 h-3.5" /> Listen First
        </button>
      </div>

      {/* Record */}
      <div className="flex items-center gap-3">
        <button onClick={toggleRecording}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-md ${recording ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
          {recording ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{recording ? '🔴 Reciting — tap to stop' : 'Tap mic to begin reciting'}</p>
          {transcript && <p className="text-xs text-slate-400 mt-0.5 italic line-clamp-2">{transcript}</p>}
        </div>
      </div>

      {transcript && !recording && (
        <Button onClick={checkTajweed} disabled={checking}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:opacity-90">
          {checking ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Checking Tajweed...</> : '🔍 Check My Recitation with AI'}
        </Button>
      )}

      {/* Result */}
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
                <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase mb-2">📚 Tajweed Rules to Practice</p>
                {result.tajweed_rules.map((r, i) => <p key={i} className="text-xs text-slate-600 dark:text-slate-400 py-0.5">• {r}</p>)}
              </div>
            )}

            {result.mistakes?.length > 0 && (
              <div className="p-3.5 bg-red-50 dark:bg-red-900/15 rounded-xl border border-red-200/60 dark:border-red-800/30">
                <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase mb-2">⚠️ Areas to Improve</p>
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