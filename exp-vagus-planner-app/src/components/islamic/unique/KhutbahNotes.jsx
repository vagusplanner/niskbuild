import React, { useState, useRef } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Sparkles, BookOpen, CheckSquare, Calendar, Loader2, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

export default function KhutbahNotes() {
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const recognitionRef = useRef(null);

  const { data: sermons = [] } = useQuery({
    queryKey: ['khutbahNotes'],
    queryFn: () => SDK.entities.JournalEntry.filter({ input_method: 'voice' }, '-entry_date', 20)
      .then(r => r.filter(j => j.title?.includes('Khutbah') || j.title?.includes('Sermon'))),
  });

  const toggleRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice recording not supported in this browser.'); return; }

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-GB';
    r.onresult = (e) => {
      const full = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setTranscript(full);
    };
    r.onend = () => setRecording(false);
    r.onerror = () => { setRecording(false); toast.error('Recording error — please try again.'); };
    r.start();
    recognitionRef.current = r;
    setRecording(true);
    toast.success('🎙️ Recording started — speak now');
  };

  const analyzeWithAI = async () => {
    if (!transcript.trim()) return toast.error('Please record or type some notes first.');
    setProcessing(true);
    try {
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are analyzing Friday Khutbah (sermon) notes. Here are the raw notes:\n\n"${transcript}"\n\nExtract and structure:\n1. Main theme/topic of the sermon\n2. Key Islamic points mentioned (with Quran/Hadith references if any)\n3. 3-5 practical action items for the listener\n4. A du'a or remembrance relevant to the topic\n5. A short motivational summary (2 sentences)`,
        response_json_schema: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
            key_points: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, priority: { type: 'string' } } } },
            dua: { type: 'string' },
            summary: { type: 'string' },
          }
        },
        model: 'claude_sonnet_4_6',
      });
      setResult(result);

      // Save to Journal
      await SDK.entities.JournalEntry.create({
        title: `Khutbah: ${result.theme}`,
        transcript,
        ai_summary: result.summary,
        tasks: result.action_items?.map(a => ({ title: a.task, priority: a.priority || 'medium', synced: false })) || [],
        spiritual_reminders: [{ reminder: result.dua, type: 'dua', synced: false }],
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        input_method: 'voice',
      });

      // Create tasks in Task entity
      for (const item of (result.action_items || [])) {
        await SDK.entities.Task.create({
          title: item.task,
          priority: item.priority || 'medium',
          category: 'spiritual',
          status: 'pending',
          notes: `From Khutbah: ${result.theme}`,
        }).catch(() => {});
      }

      qc.invalidateQueries(['khutbahNotes']);
      toast.success('✅ Sermon analyzed! Action items added to your tasks.');
    } catch (e) {
      toast.error('AI analysis failed. Please try again.');
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-teal-600" />
        <h3 className="font-black text-slate-800 dark:text-slate-100">AI Khutbah (Sermon) Notes</h3>
      </div>

      {/* Recording area */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20 border border-teal-200 dark:border-teal-800/40 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={toggleRecording}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${recording ? 'bg-red-500 animate-pulse' : 'bg-teal-500 hover:bg-teal-600'}`}>
            {recording ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-teal-800 dark:text-teal-200">{recording ? '🔴 Recording...' : 'Record Sermon Notes'}</p>
            <p className="text-xs text-teal-600/70 dark:text-teal-400/70">{recording ? 'Tap mic to stop' : 'Tap mic then speak, or type below'}</p>
          </div>
        </div>

        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Notes will appear here as you speak, or type manually..."
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none text-slate-700 dark:text-slate-200 placeholder-slate-400"
        />

        <Button onClick={analyzeWithAI} disabled={processing || !transcript.trim()}
          className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90 text-white font-bold">
          {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" />AI Summarize & Create Tasks</>}
        </Button>
      </div>

      {/* AI Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <p className="font-black text-sm text-slate-800 dark:text-slate-100">{result.theme}</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">{result.summary}</p>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Key Points</p>
              {result.key_points?.map((p, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5">
                  <span className="text-teal-500 font-bold text-xs mt-0.5">•</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{p}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><CheckSquare className="w-3 h-3" /> Action Items (added to Tasks)</p>
              {result.action_items?.map((a, i) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg mb-1">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-slate-700 dark:text-slate-300">{a.task}</p>
                  <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full ${a.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{a.priority}</span>
                </div>
              ))}
            </div>
            {result.dua && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200/60 dark:border-amber-700/40">
                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">🤲 Related Du'a</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{result.dua}</p>
              </div>
            )}
            <Button variant="outline" onClick={() => { setResult(null); setTranscript(''); }} className="w-full text-xs">Record Another Sermon</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Past sermons */}
      {sermons.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Past Sermons</p>
          <div className="space-y-2">
            {sermons.slice(0, 5).map(s => (
              <button key={s.id} onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="w-full text-left p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-teal-300 transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{s.title}</p>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-[9px] text-slate-400">{s.entry_date}</span>
                    {expanded === s.id ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </div>
                {expanded === s.id && s.ai_summary && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">{s.ai_summary}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}