import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Volume2, Copy, Star, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MOODS = [
  { id: 'anxious',    emoji: '😰', label: 'Anxious',      color: 'from-blue-400 to-indigo-500' },
  { id: 'sad',        emoji: '😢', label: 'Sad',          color: 'from-slate-400 to-blue-400' },
  { id: 'grateful',   emoji: '🤲', label: 'Grateful',     color: 'from-emerald-400 to-teal-500' },
  { id: 'angry',      emoji: '😤', label: 'Angry',        color: 'from-red-400 to-orange-500' },
  { id: 'hopeful',    emoji: '🌟', label: 'Hopeful',      color: 'from-amber-400 to-yellow-500' },
  { id: 'lonely',     emoji: '🌧️', label: 'Lonely',       color: 'from-purple-400 to-indigo-400' },
  { id: 'stressed',   emoji: '😓', label: 'Stressed',     color: 'from-orange-400 to-red-400' },
  { id: 'peaceful',   emoji: '☮️', label: 'Peaceful',     color: 'from-teal-400 to-cyan-500' },
  { id: 'scared',     emoji: '😨', label: 'Fearful',      color: 'from-slate-500 to-blue-500' },
  { id: 'happy',      emoji: '😊', label: 'Happy',        color: 'from-yellow-400 to-amber-500' },
  { id: 'lost',       emoji: '🌀', label: 'Lost / Confused', color: 'from-violet-400 to-purple-500' },
  { id: 'sick',       emoji: '🤒', label: 'Unwell / Sick', color: 'from-green-400 to-teal-400' },
];

export default function MoodDuaMatcher() {
  const [selectedMood, setSelectedMood] = useState(null);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const matchDua = async () => {
    if (!selectedMood) return toast.error('Please select your current mood');
    setLoading(true);
    setResult(null);
    try {
      const res = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are a compassionate Islamic spiritual guide. A person is feeling "${selectedMood.label}". ${context ? `Additional context: "${context}"` : ''}\n\nProvide:\n1. The most relevant authentic Du'a (supplication) for this feeling from Quran or Sunnah\n2. Arabic text of the du'a\n3. English transliteration\n4. English translation\n5. Source (Quran verse or Hadith reference)\n6. A brief compassionate Islamic reflection (2-3 sentences) speaking directly to this person\n7. A practical Sunnah action they can take right now to help their state of heart`,
        response_json_schema: {
          type: 'object',
          properties: {
            dua_name: { type: 'string' },
            arabic: { type: 'string' },
            transliteration: { type: 'string' },
            translation: { type: 'string' },
            source: { type: 'string' },
            reflection: { type: 'string' },
            sunnah_action: { type: 'string' },
          }
        }
      });
      setResult(res);
    } catch (_) { toast.error('Could not load du\'a. Please try again.'); }
    setLoading(false);
  };

  const copyDua = async () => {
    if (!result) return;
    const text = `${result.arabic}\n\n${result.transliteration}\n\n"${result.translation}"\n\n— ${result.source}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Du\'a copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const saveDua = async () => {
    if (!result) return;
    await SDK.entities.DailyDua.create({
      title: result.dua_name,
      arabic_text: result.arabic,
      transliteration: result.transliteration,
      translation: result.translation,
      source: result.source,
      category: selectedMood?.id,
      notes: result.reflection,
      is_favorite: true,
    }).catch(() => {});
    setSaved(true);
    toast.success('Du\'a saved to your library!');
  };

  const playAudio = async () => {
    if (!result?.arabic) return;
    // Use browser TTS for Arabic
    const utter = new SpeechSynthesisUtterance(result.arabic);
    utter.lang = 'ar-SA';
    utter.rate = 0.7;
    window.speechSynthesis.speak(utter);
    toast.success('🔊 Playing du\'a in Arabic');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-rose-500" />
        <h3 className="font-black text-slate-800 dark:text-slate-100">Mood → Du'a Matcher</h3>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">How are you feeling right now? I'll find the perfect du'a for your heart.</p>

      {/* Mood grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {MOODS.map(mood => (
          <motion.button key={mood.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
            onClick={() => { setSelectedMood(mood); setResult(null); setSaved(false); }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
              selectedMood?.id === mood.id
                ? `bg-gradient-to-br ${mood.color} border-transparent shadow-md text-white`
                : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700'
            }`}>
            <span className="text-2xl">{mood.emoji}</span>
            <span className={`text-[10px] font-bold leading-tight text-center ${selectedMood?.id === mood.id ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{mood.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Optional context */}
      {selectedMood && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <textarea value={context} onChange={e => setContext(e.target.value)}
            placeholder={`Tell me more about why you're feeling ${selectedMood.label.toLowerCase()}... (optional)`}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none text-slate-700 dark:text-slate-200 placeholder-slate-400" />
        </motion.div>
      )}

      <Button onClick={matchDua} disabled={loading || !selectedMood}
        className="w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 text-white font-bold hover:opacity-90">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Finding perfect du'a...</> : <><Sparkles className="w-4 h-4 mr-2" />Find My Du'a</>}
      </Button>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Arabic du'a card */}
            <div className={`bg-gradient-to-br ${selectedMood?.color} rounded-2xl p-5 text-white shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-widest opacity-80">{result.dua_name}</p>
                <p className="text-[10px] opacity-70">{result.source}</p>
              </div>
              <p className="text-2xl font-bold leading-relaxed text-center mb-3" dir="rtl" style={{ fontFamily: 'Amiri, serif' }}>
                {result.arabic}
              </p>
              <p className="text-xs italic opacity-90 text-center">{result.transliteration}</p>
            </div>

            {/* Translation */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Translation</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 italic leading-relaxed">"{result.translation}"</p>
            </div>

            {/* Reflection */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/40 p-4">
              <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase mb-1.5">💛 Reflection for You</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{result.reflection}</p>
            </div>

            {/* Sunnah action */}
            <div className="bg-teal-50 dark:bg-teal-900/15 rounded-2xl border border-teal-200 dark:border-teal-800/40 p-4">
              <p className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase mb-1.5">🤲 Sunnah Action Right Now</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{result.sunnah_action}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={playAudio} className="flex-1 text-xs gap-1">
                <Volume2 className="w-3.5 h-3.5" /> Listen
              </Button>
              <Button variant="outline" onClick={copyDua} className="flex-1 text-xs gap-1">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" onClick={saveDua} disabled={saved} className="flex-1 text-xs gap-1">
                {saved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Star className="w-3.5 h-3.5" />}
                {saved ? 'Saved' : 'Save'}
              </Button>
            </div>

            <Button variant="ghost" onClick={() => { setResult(null); setSelectedMood(null); setContext(''); setSaved(false); }}
              className="w-full text-xs text-slate-400">
              Try Another Mood
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}