"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getSafeSession } from '@/lib/supabaseSession';
import {
  DEFAULT_AGENT_SETTINGS,
  loadAgentSettings,
  providerBadge,
  saveAgentSettings,
  type AgentSettings,
} from '@/lib/agent-settings';

export type HelpAssistantMode = 'user' | 'admin';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  promptType?: string;
}

interface AgentAnalytics {
  total: number;
  simple: number;
  complex: number;
  ollama: number;
  groq: number;
  last7Days: number;
}

interface HelpAssistantProps {
  mode?: HelpAssistantMode;
  projectId?: string | null;
  bottomOffset?: number;
}

const STARTERS_USER = [
  'How do I build a todo app?',
  'What can I build with NiskBuild?',
  'How do I export my code?',
  "What's the difference between Pro and Agency?",
  'Help me debug my app',
];

const STARTERS_ADMIN = [
  'Summarize open support tickets workflow',
  'How do I apply a user discount?',
  'Stripe webhook checklist',
  'Which SQL migrations are required?',
];

function welcomeMessage(isAdmin: boolean): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content: isAdmin
      ? "Admin Copilot ready. I use Groq for ops questions — ask about users, tickets, Stripe, or migrations."
      : "Hi! I'm your NiskBuild AI assistant. I can help with plans, the builder, exports, and troubleshooting. What can I help you with?",
    timestamp: new Date(),
  };
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function HelpAssistant({
  mode = 'user',
  projectId = null,
  bottomOffset = 0,
}: HelpAssistantProps) {
  const isAdmin = mode === 'admin';
  const starters = isAdmin ? STARTERS_ADMIN : STARTERS_USER;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS);
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const sendRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    setSettings(loadAgentSettings());
  }, []);

  useEffect(() => {
    if (!open) return;
    getSafeSession().then((session) => setUser(session?.user ?? null));
  }, [open]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([welcomeMessage(isAdmin)]);
    }
  }, [open, isAdmin, messages.length]);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai-agent?mode=${mode}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.analytics) setAnalytics(data.analytics);
    } catch {
      /* ignore */
    }
  }, [mode]);

  useEffect(() => {
    if (open) loadAnalytics();
  }, [open, loadAnalytics]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      const historyForApi = messages.filter((m) => m.id !== 'welcome' || m.role === 'user');
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch('/api/ai-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            message: trimmed,
            mode,
            projectId,
            preferredProvider: settings.preferredProvider,
            conversationHistory: historyForApi.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        const data = await res.json();
        const reply =
          data.response || data.error || 'Something went wrong. Try again or contact support.';

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
            provider: data.provider,
            promptType: data.promptType,
          },
        ]);
        loadAnalytics();
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: 'Network error — check your connection and try again.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, mode, projectId, settings.preferredProvider, loadAnalytics]
  );

  sendRef.current = sendMessage;

  const updateSettings = (next: AgentSettings) => {
    setSettings(next);
    saveAgentSettings(next);
  };

  const startVoiceInput = () => {
    if (!settings.voiceEnabled) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    recognitionRef.current?.stop();
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? '')
        .join('');
      setInput(transcript);
      if (event.results[0]?.isFinal && transcript.trim()) {
        setIsListening(false);
        setTimeout(() => sendRef.current(transcript.trim()), 200);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
  };

  const clearChat = () => {
    setMessages([welcomeMessage(isAdmin)]);
  };

  const handleEscalate = async () => {
    if (!user) {
      alert('Please sign in to escalate to support.');
      return;
    }

    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (!lastUserMessage) {
      alert('Send a message first so we know what you need help with.');
      return;
    }

    const historyForApi = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    setLoading(true);
    try {
      const response = await fetch('/api/agent-escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userEmail: user.email,
          message: lastUserMessage.content,
          conversationHistory: historyForApi,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Escalation failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `esc-${Date.now()}`,
          role: 'assistant',
          content:
            data.message ||
            "Your request has been escalated to our support team. We'll respond within 24 hours.",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Escalation error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `esc-err-${Date.now()}`,
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'Could not escalate right now. Try /dashboard/support or contact us on the landing page.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const providerLabel =
    settings.preferredProvider === 'auto'
      ? 'Smart routing'
      : settings.preferredProvider === 'ollama'
        ? 'Local mode'
        : 'Cloud mode';

  const bottom = 16 + bottomOffset;
  const positionClass = isAdmin ? 'right-4 items-end' : 'left-4 items-start';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none md:pointer-events-none"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={`fixed z-[95] flex flex-col gap-3 ${positionClass}`}
        style={{ bottom }}
      >
        {open && (
          <div
            className="w-[min(100vw-2rem,420px)] h-[min(72vh,600px)] flex flex-col rounded-2xl border border-nisk bg-nisk-card shadow-2xl overflow-hidden pointer-events-auto"
          >
            <div
              className={`shrink-0 px-4 py-3 flex items-center gap-2 border-b border-nisk bg-gradient-to-r from-[var(--secondary)] via-[var(--primary)] to-[var(--accent-teal)]`}
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
                AI
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {isAdmin ? 'Admin Copilot' : 'NiskBuild AI'}
                </p>
                <p className="text-[10px] text-white/80 truncate">
                  {messages.length} messages · {providerLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                title="Settings"
              >
                ⚙️
              </button>
              <button
                type="button"
                onClick={clearChat}
                className="text-white/80 hover:text-white text-[10px] px-2 py-1 rounded-lg hover:bg-white/10"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {showSettings && (
              <div className="shrink-0 p-3 border-b border-nisk bg-[var(--surface-elevated)] space-y-3">
                <p className="text-xs font-semibold text-[var(--foreground)]">Agent settings</p>
                <div>
                  <label className="text-[10px] text-nisk-muted block mb-1">Provider</label>
                  <select
                    value={settings.preferredProvider}
                    onChange={(e) =>
                      updateSettings({
                        ...settings,
                        preferredProvider: e.target.value as AgentSettings['preferredProvider'],
                      })
                    }
                    className="w-full p-2 bg-nisk-card border border-nisk rounded-lg text-xs text-[var(--foreground)]"
                  >
                    <option value="auto">Auto (smart routing)</option>
                    <option value="ollama">Ollama (local · private)</option>
                    <option value="groq">Groq (cloud · best quality)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-nisk-muted">Voice input</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({ ...settings, voiceEnabled: !settings.voiceEnabled })
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      settings.voiceEnabled
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--surface-elevated)] text-nisk-muted border border-nisk'
                    }`}
                  >
                    {settings.voiceEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                {analytics && (
                  <div className="pt-2 border-t border-nisk text-[10px] text-nisk-muted space-y-0.5">
                    <p>
                      {analytics.total} chats · {analytics.simple} simple · {analytics.complex}{' '}
                      complex · {analytics.last7Days} this week
                    </p>
                    <p>
                      Local: {analytics.ollama} · Cloud: {analytics.groq}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-[var(--background)]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-[var(--primary)] text-white rounded-br-md'
                        : 'bg-nisk-card border border-nisk text-[var(--foreground)] rounded-bl-md shadow-sm'
                    }`}
                  >
                    {m.content}
                    {m.role === 'assistant' && (m.provider || m.promptType) && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {m.provider && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] text-nisk-muted">
                            {providerBadge(m.provider)}
                          </span>
                        )}
                        {m.promptType && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] text-nisk-muted">
                            {m.promptType}
                          </span>
                        )}
                        <span className="text-[9px] text-nisk-muted">
                          {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-nisk-card border border-nisk rounded-2xl px-3 py-2 flex gap-1">
                    <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 1 && (
              <div className="shrink-0 px-3 pb-2 flex flex-wrap gap-1.5 bg-[var(--background)]">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="text-[10px] px-2 py-1 rounded-full bg-nisk-card border border-nisk text-nisk-muted hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="shrink-0 p-3 border-t border-nisk bg-nisk-card space-y-2">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  rows={2}
                  placeholder={
                    isListening ? 'Listening…' : isAdmin ? 'Ask about ops…' : 'Ask me anything…'
                  }
                  disabled={loading || isListening}
                  className={`flex-1 resize-none rounded-xl border px-3 py-2 text-sm bg-[var(--surface-elevated)] text-[var(--foreground)] placeholder:text-nisk-muted focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 ${
                    isListening
                      ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                      : 'border-nisk'
                  }`}
                />
                {settings.voiceEnabled && (
                  <button
                    type="button"
                    onClick={startVoiceInput}
                    disabled={loading || isListening}
                    className={`self-end px-3 py-2 rounded-xl text-sm transition-colors ${
                      isListening
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : 'bg-[var(--surface-elevated)] text-nisk-muted hover:bg-[var(--card-bg)] border border-nisk'
                    }`}
                    title="Voice input"
                  >
                    🎤
                  </button>
                )}
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={handleEscalate}
                    disabled={loading || isListening}
                    className="self-end px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm transition-colors disabled:opacity-50"
                    title="Escalate to support"
                    aria-label="Escalate to human support"
                  >
                    🆘
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim() || isListening}
                  className="self-end px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  Send
                </button>
              </div>
              <div className="flex justify-between text-[9px] text-nisk-muted">
                <span>{providerLabel}</span>
                <span>{analytics?.total ?? 0} conversations logged</span>
              </div>
              {!isAdmin && (
                <p className="text-[10px] text-nisk-muted text-center">
                  Need a human?{' '}
                  <Link href="/dashboard/support" className="text-[var(--primary)] hover:underline">
                    Support
                  </Link>
                  {' · '}
                  <Link href="/landing#contact" className="text-[var(--primary)] hover:underline">
                    Contact
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`pointer-events-auto w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white font-semibold transition-transform hover:scale-105 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]`}
          aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
          title={isAdmin ? 'Admin Copilot' : 'NiskBuild AI'}
        >
          {open ? '✕' : '💬'}
        </button>
      </div>
    </>
  );
}
