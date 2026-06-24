/**
 * MeetingNotesRecorder — Record audio & AI-summarize meeting notes.
 * Embedded in Finance > AI Advisor tab (for financial meetings) and Connect page.
 * Saves summary to Meeting entity (outcome_notes + ai_summary).
 */
import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, FileText, Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MeetingNotesRecorder({ compact = false }) {
  const [phase, setPhase] = useState('idle'); // idle | recording | processing | done
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Meeting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Meeting notes saved!');
    }
  });

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
    if (!stream) { toast.error('Microphone access denied'); return; }
    const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
    chunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      await processAudio(new Blob(chunksRef.current, { type: mr.mimeType }));
    };
    mr.start(250);
    mediaRecorderRef.current = mr;
    setPhase('recording');
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setPhase('processing');
  };

  const processAudio = async (blob) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
      const rawTranscript = await base44.integrations.Core.InvokeLLM({
        prompt: 'Transcribe this audio recording exactly. Return only the transcription text.',
        file_urls: [file_url],
      });
      const text = typeof rawTranscript === 'string' ? rawTranscript : JSON.stringify(rawTranscript);
      setTranscript(text);

      // AI summarize
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Summarize this meeting transcript into structured notes. Include: key decisions, action items (with owner if mentioned), and next steps. Be concise and professional.\n\nTranscript:\n${text}`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            key_decisions: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'string' } },
            next_steps: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setSummary(result);
      setPhase('done');
    } catch (e) {
      toast.error('Could not process audio. Try again.');
      setPhase('idle');
    }
  };

  const saveSummary = () => {
    if (!summary) return;
    const formattedSummary = JSON.stringify(summary);
    saveMutation.mutate({
      title: title || `Meeting — ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
      organizer_email: 'me',
      duration_minutes: Math.ceil(seconds / 60),
      outcome_notes: transcript,
      ai_summary: formattedSummary,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  };

  const copyToClipboard = () => {
    if (!summary) return;
    const text = [
      `📋 ${title || 'Meeting Notes'}`,
      `\n📝 Summary:\n${summary.summary}`,
      summary.key_decisions?.length ? `\n✅ Key Decisions:\n${summary.key_decisions.map(d => `• ${d}`).join('\n')}` : '',
      summary.action_items?.length ? `\n🎯 Action Items:\n${summary.action_items.map(a => `• ${a}`).join('\n')}` : '',
      summary.next_steps?.length ? `\n➡️ Next Steps:\n${summary.next_steps.map(n => `• ${n}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Notes copied to clipboard!');
  };

  const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const reset = () => { setPhase('idle'); setTranscript(''); setSummary(null); setSeconds(0); setTitle(''); };

  return (
    <Card className={compact ? 'border-violet-100 dark:border-violet-900' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-100 dark:bg-violet-900/40 rounded-lg">
            <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">AI Meeting Notes Recorder</span>
          {phase === 'done' && (
            <div className="ml-auto flex gap-1.5">
              <Button size="sm" variant="outline" onClick={copyToClipboard} className="h-7 text-xs">
                {copied ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button size="sm" onClick={saveSummary} disabled={saveMutation.isPending} className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={reset} className="h-7 text-xs">New</Button>
            </div>
          )}
        </div>

        {phase === 'idle' && (
          <div className="space-y-2">
            <Input placeholder="Meeting title (optional)" value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-sm" />
            <Button onClick={startRecording} className="w-full bg-violet-600 hover:bg-violet-700 text-white h-10">
              <Mic className="w-4 h-4 mr-2" /> Start Recording Meeting
            </Button>
            <p className="text-[10px] text-slate-400 text-center">Records audio → AI transcribes → AI summarizes with action items</p>
          </div>
        )}

        {phase === 'recording' && (
          <div className="text-center space-y-3 py-2">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-14 h-14 mx-auto rounded-full bg-red-500 flex items-center justify-center shadow-lg">
              <Mic className="w-7 h-7 text-white" />
            </motion.div>
            <p className="text-xl font-mono font-bold text-slate-800 dark:text-slate-100">{fmt(seconds)}</p>
            <p className="text-xs text-red-500 font-semibold animate-pulse">● Recording…</p>
            <Button onClick={stopRecording} className="bg-slate-800 text-white hover:bg-slate-900 rounded-full px-8">
              <Square className="w-4 h-4 mr-2 fill-current" /> Stop & Summarize
            </Button>
          </div>
        )}

        {phase === 'processing' && (
          <div className="text-center space-y-2 py-4">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">AI is transcribing & summarizing…</p>
            <p className="text-xs text-slate-400">This may take 20–60 seconds</p>
          </div>
        )}

        {phase === 'done' && summary && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-900">
              <p className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Summary
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{summary.summary}</p>
            </div>
            {summary.key_decisions?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">✅ Key Decisions</p>
                <ul className="space-y-0.5">
                  {summary.key_decisions.map((d, i) => <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">•</span>{d}</li>)}
                </ul>
              </div>
            )}
            {summary.action_items?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">🎯 Action Items</p>
                <ul className="space-y-0.5">
                  {summary.action_items.map((a, i) => <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span>{a}</li>)}
                </ul>
              </div>
            )}
            {summary.next_steps?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">➡️ Next Steps</p>
                <ul className="space-y-0.5">
                  {summary.next_steps.map((n, i) => <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span>{n}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}