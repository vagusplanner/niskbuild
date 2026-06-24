import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Calendar, CheckSquare, Mic, Zap, Copy,
  ExternalLink, CheckCircle2, Clock, ArrowRight, Smartphone, Shield, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
    queryFn: () => SDK.auth.me(),
  });

  // Fetch recent tasks created via WhatsApp (tagged with source)
  const { data: recentTasks = [] } = useQuery({
    queryKey: ['whatsappTasks'],
    queryFn: () => SDK.entities.Task.list('-created_date', 10),
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['whatsappEvents'],
    queryFn: () => SDK.entities.Event.list('-created_date', 10),
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await SDK.agents.getWhatsAppConnectURL('whatsapp_planner');
      setWhatsappUrl(url);
    } catch {
      toast.error('Could not generate WhatsApp link — please try again.');
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

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#25D366]/20 via-[#128C7E]/30 to-[#075E54]/40 border border-[#25D366]/30 p-6 shadow-2xl">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2325D366' fill-opacity='0.4'%3E%3Cpath d='M20 20c0 5.5-4.5 10-10 10S0 25.5 0 20 4.5 10 10 10s10 4.5 10 10zm10-10c0 5.5-4.5 10-10 10s-10-4.5-10-10S14.5 0 20 0s10 4.5 10 10z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
            <div className="relative flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#25D366]/30">
                <MessageCircle className="w-7 h-7 text-white fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 px-2 py-0.5 rounded-full uppercase tracking-widest">WhatsApp AI</span>
                </div>
                <h1 className="text-2xl font-black text-white mb-1">WhatsApp → Planner</h1>
                <p className="text-white/60 text-sm leading-relaxed">
                  Forward voice notes or type messages on WhatsApp — AI instantly adds events and tasks to Vagus Planner.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Connect Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-white/[0.04] border border-white/12 rounded-3xl p-6 space-y-4">
            <h2 className="text-white font-black text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#25D366]" /> Connect Your WhatsApp
            </h2>

            {!whatsappUrl ? (
              <div className="space-y-4">
                <p className="text-white/50 text-sm leading-relaxed">
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
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Shield className="w-3.5 h-3.5 text-[#25D366]/50" />
                  No messages are stored. Your WhatsApp number is never saved on our servers.
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-[#25D366]/10 border border-[#25D366]/25 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-[#25D366] flex-shrink-0" />
                  <p className="text-sm text-[#25D366] font-bold">WhatsApp link generated!</p>
                </div>
                <div className="flex gap-2">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full bg-[#25D366] hover:bg-[#20b558] text-white font-bold gap-2">
                      <ExternalLink className="w-4 h-4" /> Open in WhatsApp
                    </Button>
                  </a>
                  <Button variant="outline" onClick={handleCopy} className="border-white/20 text-white bg-transparent gap-2">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-[#25D366]" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-white/30 text-xs text-center">Save this chat — this is your personal AI planner number.</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* How it works */}
        <div className="space-y-2">
          <p className="text-xs font-black text-white/30 uppercase tracking-widest px-1">How It Works</p>
          <div className="grid grid-cols-2 gap-3">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-400/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black text-teal-400">{step}</span>
                  </div>
                  <Icon className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-sm font-black text-white">{title}</p>
                <p className="text-[11px] text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Example messages */}
        <div className="space-y-2">
          <p className="text-xs font-black text-white/30 uppercase tracking-widest px-1">What You Can Send</p>
          <div className="space-y-2">
            {EXAMPLES.map((ex, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/8 rounded-2xl hover:border-white/15 transition-all">
                <span className="text-xl flex-shrink-0">{ex.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium truncate">"{ex.text}"</p>
                  <p className="text-[11px] text-teal-400/70 mt-0.5">→ {ex.result}</p>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full border flex-shrink-0
                  border-blue-400/20 text-blue-400/70 bg-blue-400/5">
                  {ex.type}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent imports */}
        {recentImports.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black text-white/30 uppercase tracking-widest px-1">Recent Imports</p>
            <div className="space-y-1.5">
              {recentImports.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/6 rounded-2xl">
                  {item._kind === 'task'
                    ? <CheckSquare className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    : <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                  <p className="text-sm text-white/70 flex-1 truncate">{item.title}</p>
                  <span className="text-[10px] text-white/25 flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {item.created_date ? format(new Date(item.created_date), 'd MMM') : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI capabilities note */}
        <div className="flex items-start gap-3 p-4 bg-purple-500/8 border border-purple-500/20 rounded-2xl">
          <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-purple-300 mb-1">AI understands natural language</p>
            <p className="text-xs text-white/45 leading-relaxed">
              Send voice notes, messy text, or vague instructions like "remind me about the thing John said next week" — the AI will do its best to extract and log it. Islamic dates, prayer times, and Arabic terms are fully supported.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}