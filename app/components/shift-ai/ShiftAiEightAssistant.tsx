'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, MessageCircleQuestion, X } from 'lucide-react';
import { shiftAiAppPath, shiftAiPublicPathname } from '@/lib/supereduc8-host';

type Citation = { type: string; href: string; title: string };

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
};

const STARTERS = [
  'How do I use flashcards?',
  'How do I cancel my subscription?',
  'What happens when my trial ends?',
  'What does the parent dashboard show?',
];

function welcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      "Hi — I'm **8**, SuperEduc8's product guide.\n\nI help with how the app works: features, billing, and your account.\n\nFor homework or studying a topic, use **AI Tutor Chat** in the sidebar — that's the learning assistant. I'm not that.",
  };
}

/**
 * Floating "8" product help — visually distinct from AI Tutor (sidebar).
 */
export default function ShiftAiEightAssistant() {
  const pathname = usePathname() || '/';
  const publicPath = shiftAiPublicPathname(pathname);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };

      const historyForApi = messages.filter((m) => m.id !== 'welcome');
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch('/api/shift-ai/eight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            message: trimmed,
            pathname: publicPath,
            conversationHistory: historyForApi.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        const data = (await res.json()) as {
          response?: string;
          error?: string;
          citations?: Citation[];
        };
        const reply =
          data.response ||
          data.error ||
          'Something went wrong. Try Tips & Help from the sidebar.';

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: reply,
            citations: Array.isArray(data.citations) ? data.citations : undefined,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: 'Network error — check your connection and try again.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, publicPath]
  );

  const clearChat = () => setMessages([welcomeMessage()]);

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 end-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sa-coral)] text-white shadow-lg ring-2 ring-white/80 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sa-navy-800)] md:bottom-6 md:end-6"
          aria-label="Open 8 — product help"
          data-testid="se8-eight-fab"
          title="Ask 8 (product help — not AI Tutor)"
        >
          <span className="text-2xl font-extrabold leading-none tracking-tight">8</span>
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed bottom-4 end-4 z-50 flex h-[min(560px,calc(100vh-5rem))] w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-[var(--sa-navy-100)] bg-white shadow-2xl md:bottom-6 md:end-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="se8-eight-title"
        >
          <header className="flex flex-shrink-0 items-center gap-3 bg-[var(--sa-navy-800)] px-4 py-3 text-white">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--sa-coral)] text-lg font-extrabold">
              8
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="se8-eight-title" className="truncate text-sm font-bold">
                Ask 8
              </h2>
              <p className="truncate text-[11px] text-white/70">
                Product help · not AI Tutor
              </p>
            </div>
            <button
              type="button"
              onClick={clearChat}
              className="rounded-lg px-2 py-1 text-[10px] text-white/80 hover:bg-white/10 hover:text-white"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close 8"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <p className="flex-shrink-0 border-b border-[var(--sa-navy-100)] bg-[var(--sa-secondary)] px-3 py-2 text-[11px] text-[var(--sa-navy-800)]">
            On this page:{' '}
            <span className="font-semibold">{publicPath || '/'}</span>
            {' · '}
            <Link href={shiftAiAppPath('/tips')} className="font-semibold underline">
              Tips &amp; Help
            </Link>
            {' · '}
            <Link href={shiftAiAppPath('/assistant')} className="font-semibold underline">
              AI Tutor
            </Link>
          </p>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-[var(--sa-navy-800)] text-white'
                      : 'rounded-bl-sm bg-[var(--sa-secondary)] text-[var(--sa-navy-800)]'
                  }`}
                >
                  {m.content.replace(/\*\*(.*?)\*\*/g, '$1')}
                  {m.citations && m.citations.length > 0 ? (
                    <ul className="mt-2 space-y-1 border-t border-black/10 pt-2 text-[11px]">
                      {m.citations.slice(0, 4).map((c) => (
                        <li key={`${c.href}-${c.title}`}>
                          <Link href={c.href} className="font-semibold underline">
                            {c.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                8 is thinking…
              </div>
            ) : null}
          </div>

          {messages.length <= 1 ? (
            <div className="flex flex-shrink-0 flex-wrap gap-1.5 border-t border-[var(--sa-navy-100)] px-3 py-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void sendMessage(s)}
                  className="rounded-full border border-[var(--sa-navy-100)] px-2.5 py-1 text-[11px] font-medium text-[var(--sa-navy-800)] hover:border-[var(--sa-coral)]"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="flex flex-shrink-0 gap-2 border-t border-[var(--sa-navy-100)] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              placeholder="Ask about features, billing, or account…"
              className="sa-input min-h-[2.75rem] flex-1 resize-none px-3 py-2 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="sa-btn-primary inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl disabled:opacity-50"
              aria-label="Send"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircleQuestion className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
