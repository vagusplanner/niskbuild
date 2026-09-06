import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MessageCircle, Calendar, CheckSquare, Mic, Zap, Copy,
  ExternalLink, CheckCircle2, Clock, Smartphone, Shield, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { buildWhatsAppConnectURL } from '@/lib/whatsapp';

const EXAMPLES = [
  { icon: '📅', type: 'Event',  text: 'Dentist appointment Thursday 3pm',           result: 'Added to Calendar: Thu 3:00 PM' },
  { icon: '✅', type: 'Task',   text: 'Pick up dry cleaning on the way home',        result: 'Task added: Pick up dry cleaning' },
  { icon: '🕌', type: 'Event',  text: "Remind me 30 mins before Jumu'ah tomorrow",   result: "Event: Jumu'ah — Fri, reminder set" },
  { icon: '🎙️', type: 'Voice', text: 'Voice note: "Call mum, buy birthday cake…"',   result: '2 tasks created automatically' },
  { icon: '📋', type: 'Query',  text: "What's on today?",                             result: 'Summary of today\'s events sent back' },
];

const HOW_IT_WORKS = [
  { step: '1', icon: Smartphone, title: 'Connect WhatsApp',    desc: 'Tap the button below to link your WhatsApp number to your Vagus Planner account.' },
  { step: '2', icon: Mic,        title: 'Send a message',      desc: 'Forward voice notes, type tasks, or describe events in plain language.' },
  { step: '3', icon: Sparkles,   title: 'AI parses instantly', desc: 'Our AI understands dates, times, tasks, and Islamic events automatically.' },
  { step: '4', icon: Calendar,   title: 'Auto-added to app',   desc: 'Items appear in your calendar or task list in real time — no manual entry.' },
];

export default function WhatsAppImport() {
  const [whatsappUrl, setWhatsappUrl] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recentTasks = [] } = useQuery({
    queryKey: ['whatsappTasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 10),
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['whatsappEvents'],
    queryFn: () => base44.entities.Event.list('-created_date', 10),
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Prefer enriched URL (email/user id in prefilled message); fall back to SDK helper.
      let url;
      try {
        url = buildWhatsAppConnectURL('whatsapp_planner', {
          email: user?.email,
          userId: user?.id,
        });
      } catch {
        url = base44.agents.getWhatsAppConnectURL('whatsapp_planner');
      }
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        throw new Error('Connect helper returned an invalid WhatsApp URL');
      }
      setWhatsappUrl(url);
    } catch (err) {
      console.error('WhatsApp connect link failed:', err);
      const detail = err?.message || err?.error_description || '';
      toast.error(
        detail
          ? `Could not generate WhatsApp link: ${detail}`
          : 'Could not generate WhatsApp link — please try again.'
      );
    }
    setConnecting(false);
  };

  const handleCopy = () => {
    if (whatsappUrl) {
      navigator.clipboard.writeText(whatsappUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const recentImports = [
    ...recentTasks.slice(0, 5).map(t => ({ ...t, _kind: 'task' })),
    ...recentEvents.slice(0, 5).map(e => ({ ...e, _kind: 'event' })),
  ]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-6">

        {/* Header — solid dark green so white title text always contrasts */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] border border-[#25D366]/40 p-6 shadow-2xl">
            <div className="relative flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
                <MessageCircle className="w-7 h-7 text-white fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded-full uppercase tracking-widest">WhatsApp AI</span>
                </div>
                <h1 className="text-2xl font-black text-white mb-1">WhatsApp → Planner</h1>
                <p className="text-white/90 text-sm leading-relaxed">
                  Forward voice notes or type messages on WhatsApp — AI instantly adds events and tasks to Vagus Planner.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Connect Card — theme-aware text (was white-on-ice-blue = invisible in light mode) */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 space-y-4 shadow-sm">
            <h2 className="text-slate-900 dark:text-slate-100 font-black text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#25D366]" /> Connect Your WhatsApp
            </h2>

            {!whatsappUrl ? (
              <div className="space-y-4">
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Tap below to link your WhatsApp to your account. You'll be redirected to WhatsApp — no phone number is stored.
                </p>
                <Button onClick={handleConnect} disabled={connecting}
                  className="w-full bg-[#25D366] hover:bg-[#20b558] text-white font-black h-12 text-base gap-2 shadow-lg shadow-[#25D366]/20">
                  {connecting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating link…</>
                  ) : (
                    <><MessageCircle className="w-5 h-5" /> Connect on WhatsApp</>
                  )}
                </Button>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Shield className="w-3.5 h-3.5 text-[#25D366]" />
                  No messages are stored. Your WhatsApp number is never saved on our servers.
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-[#25D366]/10 border border-[#25D366]/30 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-[#128C7E] dark:text-[#25D366] flex-shrink-0" />
                  <p className="text-sm text-[#075E54] dark:text-[#25D366] font-bold">WhatsApp link generated!</p>
                </div>
                <div className="flex gap-2">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full bg-[#25D366] hover:bg-[#20b558] text-white font-bold gap-2">
                      <ExternalLink className="w-4 h-4" /> Open in WhatsApp
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 bg-transparent gap-2"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-[#25D366]" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs text-center">Save this chat — this is your personal AI planner number.</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* How it works */}
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">How It Works</p>
          <div className="grid grid-cols-2 gap-3">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black text-teal-700 dark:text-teal-400">{step}</span>
                  </div>
                  <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Example messages */}
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">What You Can Send</p>
          <div className="space-y-2">
            {EXAMPLES.map((ex, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-teal-300 dark:hover:border-teal-700 transition-all shadow-sm">
                <span className="text-xl flex-shrink-0">{ex.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-medium truncate">"{ex.text}"</p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">→ {ex.result}</p>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full border flex-shrink-0
                  border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40">
                  {ex.type}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent imports */}
        {recentImports.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Recent Imports</p>
            <div className="space-y-1.5">
              {recentImports.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                  {item._kind === 'task'
                    ? <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    : <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                  <p className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{item.title}</p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {item.created_date ? format(new Date(item.created_date), 'd MMM') : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI capabilities note */}
        <div className="flex items-start gap-3 p-4 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-2xl">
          <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-violet-900 dark:text-violet-200 mb-1">AI understands natural language</p>
            <p className="text-xs text-violet-800/80 dark:text-violet-200/70 leading-relaxed">
              Send voice notes, messy text, or vague instructions like "remind me about the thing John said next week" — the AI will do its best to extract and log it. Islamic dates, prayer times, and Arabic terms are fully supported.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
