import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Moon, Star, Copy, Share2, Loader2, Heart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';

const OCCASION_TYPES = [
  { id: 'ramadan_start', label: '🌙 Ramadan Mubarak', emoji: '🌙', gradient: 'from-indigo-600 to-violet-600' },
  { id: 'ramadan_mid', label: '🌟 Mid-Ramadan', emoji: '🌟', gradient: 'from-violet-600 to-purple-600' },
  { id: 'laylatul_qadr', label: '✨ Laylatul Qadr', emoji: '✨', gradient: 'from-amber-500 to-yellow-500' },
  { id: 'eid_fitr', label: '🎉 Eid al-Fitr', emoji: '🎉', gradient: 'from-emerald-500 to-teal-500' },
  { id: 'eid_adha', label: '🐑 Eid al-Adha', emoji: '🐑', gradient: 'from-rose-500 to-pink-500' },
  { id: 'hajj', label: '🕌 Hajj Season', emoji: '🕌', gradient: 'from-amber-600 to-orange-500' },
  { id: 'new_hijri_year', label: '📅 New Hijri Year', emoji: '📅', gradient: 'from-teal-500 to-cyan-500' },
  { id: 'mawlid', label: '💚 Mawlid al-Nabi', emoji: '💚', gradient: 'from-green-600 to-emerald-600' },
];

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'Arabic (عربي)' },
  { id: 'fr', label: 'French' },
  { id: 'ur', label: 'Urdu' },
  { id: 'tr', label: 'Turkish' },
];

const TONES = [
  { id: 'warm_family', label: 'Warm & Family' },
  { id: 'formal', label: 'Formal / Professional' },
  { id: 'poetic', label: 'Poetic & Spiritual' },
  { id: 'brief', label: 'Short & Sweet' },
];

export default function IslamicGreetingGenerator() {
  const [occasion, setOccasion] = useState('eid_fitr');
  const [language, setLanguage] = useState('en');
  const [tone, setTone] = useState('warm_family');
  const [recipientName, setRecipientName] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedOccasion = OCCASION_TYPES.find(o => o.id === occasion);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are a Muslim greeting card writer. Generate a beautiful, heartfelt Islamic greeting message.

Occasion: ${OCCASION_TYPES.find(o => o.id === occasion)?.label || occasion}
Language: ${LANGUAGES.find(l => l.id === language)?.label || language}
Tone: ${TONES.find(t => t.id === tone)?.label || tone}
${recipientName ? `Recipient name: ${recipientName}` : ''}
${personalNote ? `Personal context: ${personalNote}` : ''}

Requirements:
1. greeting: The main greeting message (3-6 sentences) — write in ${language === 'en' ? 'English' : language === 'ar' ? 'Arabic script' : language === 'fr' ? 'French' : language === 'ur' ? 'Urdu script' : language === 'tr' ? 'Turkish' : 'English'}
2. dua: A beautiful, appropriate Islamic Du'a for this occasion (in ${language === 'ar' ? 'Arabic' : 'English translation'}) — 1-3 sentences
3. arabic_blessing: The standard Arabic greeting for this occasion (e.g. رمضان مبارك, عيد مبارك) with transliteration
4. meaning: Brief meaning of the Arabic blessing in English
5. emoji_decoration: A string of 3-5 relevant emojis to decorate the message

Make it genuine, spiritually uplifting, and appropriate for sharing on WhatsApp/social media.`,
        response_json_schema: {
          type: 'object',
          properties: {
            greeting: { type: 'string' },
            dua: { type: 'string' },
            arabic_blessing: { type: 'string' },
            meaning: { type: 'string' },
            emoji_decoration: { type: 'string' },
          }
        }
      });
      setResult(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fullMessage = result
    ? `${result.emoji_decoration}\n\n${result.arabic_blessing}\n${result.meaning}\n\n${result.greeting}\n\n🤲 ${result.dua}\n\n${result.emoji_decoration}`
    : '';

  const copyMessage = () => {
    navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    toast.success('Message copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`px-5 py-4 bg-gradient-to-r ${selectedOccasion?.gradient || 'from-indigo-600 to-violet-600'} flex items-center gap-3`}>
        <div className="p-2 bg-white/10 rounded-xl">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Islamic Greeting Generator</h3>
          <p className="text-xs text-white/70">Personalised Ramadan · Eid · Islamic occasion messages</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Occasion selector */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Occasion</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {OCCASION_TYPES.map(occ => (
              <button key={occ.id} onClick={() => setOccasion(occ.id)}
                className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition-all border ${occasion === occ.id ? `bg-gradient-to-r ${occ.gradient} text-white border-transparent shadow-sm` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                {occ.label}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400">
              {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400">
              {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Recipient (optional)</label>
            <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. Ahmed family"
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Personal context</label>
            <input value={personalNote} onChange={e => setPersonalNote(e.target.value)} placeholder="e.g. new baby"
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>

        <Button onClick={generate} disabled={loading}
          className={`w-full h-10 bg-gradient-to-r ${selectedOccasion?.gradient || 'from-indigo-600 to-violet-600'} text-white font-bold hover:opacity-90`}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating…</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Greeting</>}
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Arabic blessing */}
              <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-2xl border border-amber-200 dark:border-amber-800">
                <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mb-1" dir="rtl">{result.arabic_blessing}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 italic">{result.meaning}</p>
                <p className="text-2xl mt-1">{result.emoji_decoration}</p>
              </div>

              {/* Message */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{result.greeting}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1">🤲 Du'a</p>
                  <p className="text-sm text-teal-800 dark:text-teal-300 italic leading-relaxed">{result.dua}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={copyMessage} variant="outline" className={`flex-1 h-9 ${copied ? 'text-emerald-600 border-emerald-400' : ''}`}>
                  {copied ? <><Check className="w-4 h-4 mr-1.5 text-emerald-500" />Copied!</> : <><Copy className="w-4 h-4 mr-1.5" />Copy Full Message</>}
                </Button>
                <Button onClick={generate} variant="outline" className="h-9 px-3" title="Regenerate">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}