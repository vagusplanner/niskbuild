import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, BookOpen, Sparkles, AlertCircle, RefreshCw, Mic, MicOff, Trophy, CheckCircle2, XCircle, RotateCcw, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

// ── Strictly allowed topic domains ─────────────────────────────────────────
const SYSTEM_PROMPT = `You are an Islamic AI Tutor. You ONLY answer questions within these specific domains:
1. Islamic Jurisprudence (Fiqh) — rulings on worship, prayer, fasting, purity, halal/haram
2. Quranic verses — explanations and tafsir of specific verses (cite surah and ayah)
3. Hadith — relevant authentic hadith for daily situations (cite collection and number)
4. The 99 Names of Allah (Asmaul Husna) — meanings, benefits, usage in dhikr
5. Zakat — calculation, nisab, eligible recipients, distribution
6. Sadaqah & Charity — Islamic guidance on giving, who to give to, etiquette

STRICT RULES:
- If a question falls outside these 6 domains, respond ONLY with: "I can only answer questions about Islamic fiqh, Quranic verses, hadith, the Names of Allah, zakat, and charity. Please ask within these topics."
- Always cite your sources: surah/ayah for Quran, collection/number for hadith, scholar name for fiqh opinions
- Present multiple scholarly opinions when fiqh rulings differ (e.g. Hanafi, Shafi'i, Maliki, Hanbali)
- Be respectful, clear, and educational
- Never give fatwas or definitive personal rulings — always recommend consulting a qualified scholar for personal matters
- Use transliteration for Arabic terms and provide translations`;

const SUGGESTED_QUESTIONS = [
  { emoji: '🕌', text: 'What is the ruling on combining prayers while travelling?', topic: 'Fiqh' },
  { emoji: '📖', text: 'Explain the meaning of Ayatul Kursi (2:255)', topic: 'Quran' },
  { emoji: '📿', text: 'What does the name Al-Rahman mean?', topic: 'Asmaul Husna' },
  { emoji: '💰', text: 'How do I calculate my Zakat on savings?', topic: 'Zakat' },
  { emoji: '🤲', text: 'What hadith mentions the reward for Sadaqah?', topic: 'Hadith' },
  { emoji: '🌙', text: 'Is it permissible to break fast if feeling very ill?', topic: 'Fiqh' },
  { emoji: '📿', text: 'What is the significance of saying Bismillah?', topic: 'Hadith' },
  { emoji: '❤️', text: 'Who are the eligible recipients of Zakat?', topic: 'Zakat' },
];

const TOPIC_COLORS = {
  Fiqh:         'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  Quran:        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  Hadith:       'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'Asmaul Husna': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  Zakat:        'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  Charity:      'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
};

// ── Quiz Mode ──────────────────────────────────────────────────────────────
const QUIZ_TOPICS = [
  { id: 'fiqh',    label: 'Fiqh',         emoji: '🕌' },
  { id: 'quran',   label: 'Quran',        emoji: '📖' },
  { id: 'hadith',  label: 'Hadith',       emoji: '📜' },
  { id: 'asmaul',  label: 'Asmaul Husna', emoji: '📿' },
  { id: 'zakat',   label: 'Zakat',        emoji: '💰' },
  { id: 'charity', label: 'Sadaqah',      emoji: '🤲' },
];

function QuizMode({ recentTopics = [] }) {
  const [phase, setPhase]         = useState('pick');   // pick | loading | active | result
  const [topic, setTopic]         = useState(null);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx]             = useState(0);
  const [selected, setSelected]   = useState(null);
  const [revealed, setRevealed]   = useState(false);
  const [score, setScore]         = useState(0);
  const [answers, setAnswers]     = useState([]);

  const generate = async (t) => {
    setTopic(t);
    setPhase('loading');
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 5 multiple-choice quiz questions about Islamic ${t.label}. Each question must have exactly 4 options (A, B, C, D), one correct answer, and a brief explanation (1-2 sentences) for the correct answer citing a source (Quran verse, hadith reference, or scholarly consensus).`,
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question:     { type: 'string' },
                  options:      { type: 'array', items: { type: 'string' } },
                  correct_index:{ type: 'number' },
                  explanation:  { type: 'string' },
                }
              }
            }
          }
        }
      });
      setQuestions(res?.questions || []);
      setIdx(0); setScore(0); setAnswers([]); setSelected(null); setRevealed(false);
      setPhase('active');
    } catch (_) { setPhase('pick'); }
  };

  const choose = (i) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    const q = questions[idx];
    const correct = i === q.correct_index;
    if (correct) setScore(s => s + 1);
    setAnswers(prev => [...prev, { correct, selected: i, correctIndex: q.correct_index }]);
  };

  const next = () => {
    if (idx + 1 >= questions.length) { setPhase('result'); return; }
    setIdx(i => i + 1);
    setSelected(null);
    setRevealed(false);
  };

  const restart = () => { setPhase('pick'); setTopic(null); setQuestions([]); setScore(0); setAnswers([]); };

  // ── Phase: pick topic ────────────────────────────────────────────────────
  if (phase === 'pick') return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-md">
          <Trophy className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Quiz Mode</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Test your Islamic knowledge — choose a topic to begin</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {QUIZ_TOPICS.map(t => (
          <button key={t.id} onClick={() => generate(t)}
            className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all group shadow-sm">
            <span className="text-xl">{t.emoji}</span>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-300">{t.label}</p>
              <p className="text-[9px] text-slate-400">5 questions</p>
            </div>
          </button>
        ))}
      </div>
      {recentTopics.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 mb-1">💡 Based on your recent questions</p>
          <div className="flex flex-wrap gap-1.5">
            {recentTopics.map((t, i) => (
              <button key={i} onClick={() => generate({ id: t, label: t, emoji: '📚' })}
                className="text-[10px] px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 font-semibold transition-all">
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Phase: loading ────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md">
        <Loader2 className="w-7 h-7 text-white animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Generating {topic?.label} quiz…</p>
        <p className="text-xs text-slate-400 mt-1">Preparing 5 questions with sources</p>
      </div>
    </div>
  );

  // ── Phase: active question ────────────────────────────────────────────────
  if (phase === 'active' && questions[idx]) {
    const q = questions[idx];
    const LABELS = ['A', 'B', 'C', 'D'];
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Progress */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">{topic?.emoji} {topic?.label}</span>
          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{idx + 1} / {questions.length}</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div animate={{ width: `${((idx) / questions.length) * 100}%` }}
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" />
        </div>

        {/* Question */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20 border border-teal-100 dark:border-teal-800/50">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{q.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {q.options?.map((opt, i) => {
            let style = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20';
            if (revealed) {
              if (i === q.correct_index) style = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 dark:border-emerald-600';
              else if (i === selected && i !== q.correct_index) style = 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600';
              else style = 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-50';
            }
            return (
              <button key={i} onClick={() => choose(i)} disabled={revealed}
                className={cn('w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 text-left transition-all', style, !revealed && 'cursor-pointer')}>
                <span className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
                  revealed && i === q.correct_index ? 'bg-emerald-500 text-white' :
                  revealed && i === selected && i !== q.correct_index ? 'bg-red-500 text-white' :
                  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}>{LABELS[i]}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 leading-snug">{opt}</span>
                {revealed && i === q.correct_index && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                {revealed && i === selected && i !== q.correct_index && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-teal-100 dark:border-teal-800/50 shadow-sm">
            <p className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-wide mb-1.5">📚 Explanation</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
          </motion.div>
        )}

        {revealed && (
          <Button onClick={next} className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90">
            {idx + 1 >= questions.length ? '📊 See Results' : 'Next Question'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    );
  }

  // ── Phase: result ─────────────────────────────────────────────────────────
  if (phase === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 80 ? { label: 'Excellent!', emoji: '🌟', color: 'text-emerald-600 dark:text-emerald-400' }
                : pct >= 60 ? { label: 'Good job!',  emoji: '👍', color: 'text-teal-600 dark:text-teal-400' }
                :              { label: 'Keep learning', emoji: '📖', color: 'text-amber-600 dark:text-amber-400' };
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        <div className="text-center space-y-2">
          <span className="text-5xl">{grade.emoji}</span>
          <h3 className={cn('text-xl font-black', grade.color)}>{grade.label}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{topic?.emoji} {topic?.label} Quiz</p>
        </div>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{score}/{questions.length}</p>
            <p className="text-xs text-slate-400 font-medium">Correct</p>
          </div>
          <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{pct}%</p>
            <p className="text-xs text-slate-400 font-medium">Score</p>
          </div>
        </div>
        {/* Per-question summary */}
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={i} className={cn('flex items-start gap-3 p-3 rounded-xl border text-xs',
              answers[i]?.correct
                ? 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-100 dark:border-emerald-800/40'
                : 'bg-red-50 dark:bg-red-900/15 border-red-100 dark:border-red-800/40'
            )}>
              {answers[i]?.correct
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 dark:text-slate-300 leading-snug">{q.question}</p>
                {!answers[i]?.correct && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Correct: <span className="font-bold text-emerald-600 dark:text-emerald-400">{q.options?.[q.correct_index]}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => generate(topic)} className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90">
            <RotateCcw className="w-4 h-4 mr-1" /> Retry
          </Button>
          <Button variant="outline" onClick={restart} className="flex-1">Change Topic</Button>
        </div>
      </div>
    );
  }

  return null;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
        isUser
          ? 'bg-gradient-to-br from-[#1a4a6e] to-[#1a7ab8] text-white rounded-tr-sm'
          : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm'
      )}>
        {isUser ? (
          <p className="leading-relaxed">{msg.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-headings:text-sm prose-headings:font-bold prose-strong:text-[#1a4a6e] dark:prose-strong:text-teal-300"
            components={{
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-amber-400 pl-3 my-2 text-amber-700 dark:text-amber-300 italic text-xs">{children}</blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </motion.div>
  );
}

export default function IslamicAITutor() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'quiz'
  const [recentTopics, setRecentTopics] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `**Assalamu Alaikum wa Rahmatullahi wa Barakatuh** 🌙\n\nI am your Islamic Knowledge Tutor. I can help you with:\n\n- **Fiqh** — Islamic jurisprudence & rulings\n- **Quran** — verse explanations & tafsir\n- **Hadith** — relevant narrations for daily life\n- **Asmaul Husna** — the 99 Names of Allah\n- **Zakat** — calculation & guidelines\n- **Sadaqah & Charity** — Islamic giving etiquette\n\nPlease note: I only answer within these topics. For personal fatwa, always consult a qualified scholar.\n\n*Ask me anything within these domains, insha'Allah.*`
    }]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Voice input
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.onresult = e => setInput(e.results[e.results.length - 1][0].transcript);
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { setInput(''); setIsListening(true); recognitionRef.current.start(); }
  };

  // Extract topic keywords from user messages to feed into quiz suggestions
  const extractTopic = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('fiqh') || lower.includes('ruling') || lower.includes('halal') || lower.includes('haram') || lower.includes('prayer') || lower.includes('wudu')) return 'Fiqh';
    if (lower.includes('quran') || lower.includes('surah') || lower.includes('verse') || lower.includes('ayah')) return 'Quran';
    if (lower.includes('hadith') || lower.includes('narrat') || lower.includes('prophet said')) return 'Hadith';
    if (lower.includes('allah') || lower.includes('asmaul') || lower.includes('name')) return 'Asmaul Husna';
    if (lower.includes('zakat') || lower.includes('nisab')) return 'Zakat';
    if (lower.includes('sadaqah') || lower.includes('charity') || lower.includes('donation')) return 'Sadaqah';
    return null;
  };

  const send = async (text = input) => {
    if (!text.trim() || loading) return;
    const topic = extractTopic(text);
    if (topic) setRecentTopics(prev => [...new Set([topic, ...prev])].slice(0, 4));
    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build conversation history for context (last 6 messages)
    const history = [...messages.slice(-6), userMsg]
      .map(m => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.content}`)
      .join('\n\n');

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}\n\n---\nConversation history:\n${history}\n\nUser's latest question: "${text.trim()}"\n\nProvide a thorough, well-cited answer:`,
        model: 'claude_sonnet_4_6',
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response || 'I was unable to generate a response. Please try again.' }]);
    } catch (_) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: `**New session started.** Ask me about fiqh, Quran, hadith, Asmaul Husna, zakat, or charity. 🌙`
    }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] max-h-[75vh]">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <BookOpen className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-teal-800 dark:text-teal-200">Islamic AI Tutor</h3>
            <p className="text-[10px] text-teal-600/70 dark:text-teal-400/70">Fiqh · Quran · Hadith · Zakat · Asmaul Husna</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300">AI Powered</span>
          </div>
          <button onClick={reset} title="New conversation"
            className="w-7 h-7 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/40 flex items-center justify-center text-teal-500 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Tab switcher ─────────────────────────────────── */}
      <div className="flex gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
        <button onClick={() => setActiveTab('chat')}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'chat'
              ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-teal-700 dark:hover:text-teal-300'
          )}>
          <BookOpen className="w-3.5 h-3.5" /> Chat Tutor
        </button>
        <button onClick={() => setActiveTab('quiz')}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all',
            activeTab === 'quiz'
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-amber-700 dark:hover:text-amber-300'
          )}>
          <Trophy className="w-3.5 h-3.5" /> Quiz Mode
        </button>
      </div>

      {/* ── Scope notice (chat only) ──────────────────────── */}
      {activeTab === 'chat' && (
      <div className="mx-3 mt-2 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40 rounded-xl flex-shrink-0">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
          <strong>Scope:</strong> Answers are limited to fiqh, Quran, hadith, Asmaul Husna, zakat &amp; charity only. Always consult a qualified scholar for personal rulings.
        </p>
      </div>
      )}

      {/* ── Quiz mode ────────────────────────────────────────── */}
      {activeTab === 'quiz' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <QuizMode recentTopics={recentTopics} />
        </div>
      )}

      {/* ── Chat ─────────────────────────────────────────────── */}
      {activeTab === 'chat' && <>

      {/* ── Messages ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Researching Islamic sources…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* ── Suggested questions (only if no user messages yet) ── */}
      {messages.filter(m => m.role === 'user').length === 0 && !loading && (
        <div className="px-3 pb-2 flex-shrink-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Suggested Questions</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
              <button key={i} onClick={() => send(q.text)}
                className="flex items-start gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 text-left hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all group">
                <span className="text-sm flex-shrink-0">{q.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight group-hover:text-teal-700 dark:group-hover:text-teal-300 line-clamp-2">{q.text}</p>
                  <span className={cn("inline-block mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full", TOPIC_COLORS[q.topic])}>{q.topic}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ───────────────────────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-slate-700/60 p-3 bg-white/60 dark:bg-slate-900/60 flex-shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about fiqh, Quran, hadith, Asmaul Husna, zakat…"
              rows={2}
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none leading-relaxed"
            />
            {recognitionRef.current && (
              <button onClick={toggleVoice}
                className={cn("absolute right-2 bottom-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                  isListening ? "bg-red-500 text-white" : "text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30")}>
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <Button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-br from-teal-500 to-emerald-600 hover:opacity-90 h-[4.5rem] w-11 p-0 flex-shrink-0 shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-1.5 text-center">
          Uses AI · Not a substitute for a qualified Islamic scholar
        </p>
      </div>
      </>}
    </div>
  );
}