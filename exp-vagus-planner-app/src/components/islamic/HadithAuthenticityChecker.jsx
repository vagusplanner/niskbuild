import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, CheckCircle2, AlertTriangle, XCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SDK } from '@/lib/custom-sdk.js';

const GRADE_CONFIG = {
  sahih: { label: 'Sahih (Authentic)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2, iconColor: 'text-emerald-500' },
  hasan: { label: 'Hasan (Good)', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2, iconColor: 'text-blue-500' },
  daif: { label: "Da'if (Weak)", color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500' },
  mawdu: { label: "Mawdu' (Fabricated)", color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, iconColor: 'text-red-500' },
  unknown: { label: 'Grade Unknown', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Shield, iconColor: 'text-slate-400' },
};

const EXAMPLES = [
  "Seek knowledge even if it is in China.",
  "The world is a prison for the believer and a paradise for the unbeliever.",
  "Cleanliness is half of faith.",
];

export default function HadithAuthenticityChecker() {
  const [hadith, setHadith] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const check = async () => {
    if (!hadith.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are an Islamic scholar specialising in hadith sciences (Ilm al-Hadith). Analyse this hadith text and provide an authenticity grade:

"${hadith}"

Provide:
1. grade: one of exactly: sahih, hasan, daif, mawdu, unknown
2. confidence: percentage 0-100
3. collection: which hadith collection(s) it appears in (e.g. Bukhari, Muslim, Abu Dawud, etc.) or "Not found in major collections"
4. narrator_chain: brief info about isnad if known
5. explanation: scholarly explanation of grade (2-4 sentences)
6. ruling: practical ruling for believers regarding this hadith
7. similar_authentic: if daif/mawdu, suggest a similar authentic hadith on the same topic (or null)`,
        response_json_schema: {
          type: 'object',
          properties: {
            grade: { type: 'string' },
            confidence: { type: 'number' },
            collection: { type: 'string' },
            narrator_chain: { type: 'string' },
            explanation: { type: 'string' },
            ruling: { type: 'string' },
            similar_authentic: { type: 'string' },
          }
        }
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const grade = result?.grade?.toLowerCase() || 'unknown';
  const gradeInfo = GRADE_CONFIG[grade] || GRADE_CONFIG.unknown;
  const GradeIcon = gradeInfo.icon;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl">
          <Shield className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Hadith Authenticity Checker</h3>
          <p className="text-xs text-slate-300">AI-powered Isnad & Matn analysis</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <textarea
          value={hadith}
          onChange={e => setHadith(e.target.value)}
          placeholder="Paste a hadith text here to check its authenticity…"
          rows={3}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
        />

        {/* Quick examples */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-slate-400 self-center">Try:</span>
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => setHadith(ex)}
              className="text-[10px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 hover:text-amber-700 transition-colors border border-slate-200 dark:border-slate-700 truncate max-w-[180px]">
              {ex.slice(0, 30)}…
            </button>
          ))}
        </div>

        <Button onClick={check} disabled={loading || !hadith.trim()} className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:opacity-90 h-9">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analysing…</> : <><Shield className="w-4 h-4 mr-2" />Check Authenticity</>}
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Grade badge */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${gradeInfo.color}`}>
                <GradeIcon className={`w-6 h-6 ${gradeInfo.iconColor} flex-shrink-0`} />
                <div className="flex-1">
                  <p className="font-bold text-sm">{gradeInfo.label}</p>
                  <p className="text-xs opacity-80">{result.collection}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl">{result.confidence}%</p>
                  <p className="text-[10px] opacity-70">confidence</p>
                </div>
              </div>

              {/* Explanation */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300">
                {result.explanation}
              </div>

              {/* Ruling */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">📋 Ruling for Believers</p>
                <p className="text-xs text-amber-800 dark:text-amber-300">{result.ruling}</p>
              </div>

              {/* Similar authentic alternative */}
              {result.similar_authentic && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">✅ Authentic Alternative</p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 italic">"{result.similar_authentic}"</p>
                </div>
              )}

              {/* Isnad details toggle */}
              {result.narrator_chain && (
                <button onClick={() => setShowDetails(d => !d)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors">
                  <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />Isnad Details</span>
                  {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
              {showDetails && result.narrator_chain && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {result.narrator_chain}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}