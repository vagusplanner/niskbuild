'use client';

import { useCallback, useRef, useState } from 'react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pendingAdmin?: boolean;
  ticketId?: string;
};

export default function SupportAgentPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi — I am the NiskBuild support agent. I can answer general questions immediately. For account changes, billing, or bugs I am not 100% sure about, I will open a ticket and wait for admin confirmation before any action.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollDown();

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== 'welcome')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/support/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, conversationHistory: history }),
      });
      const data = await res.json();

      const reply: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content:
          data.reply ||
          'Something went wrong. Please open a ticket manually or use the contact form below.',
        pendingAdmin: !!data.pendingAdmin,
        ticketId: data.ticketId,
      };
      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: 'Network error — try again or use the contact form.',
        },
      ]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-nisk overflow-hidden flex flex-col min-h-[320px]">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]/50">
        <h2 className="text-sm font-semibold text-white">Support agent</h2>
        <p className="text-[10px] text-nisk-muted mt-0.5">
          Instant answers when certain · escalates to admin when not
        </p>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[280px]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm rounded-xl px-3 py-2 max-w-[95%] ${
              m.role === 'user'
                ? 'ml-auto bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                : 'mr-auto bg-[var(--surface-elevated)] text-[var(--foreground)]'
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.pendingAdmin && (
              <p className="text-[10px] text-amber-400/90 mt-2 font-medium">
                ⏳ Awaiting admin confirmation
                {m.ticketId ? ` · ticket ${m.ticketId.slice(0, 8)}` : ''}
              </p>
            )}
          </div>
        ))}
        {loading && (
          <p className="text-xs text-nisk-muted animate-pulse">Support agent is thinking…</p>
        )}
      </div>

      <div className="p-3 border-t border-[var(--border)] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask about billing, builder, exports…"
          className="flex-1 rounded-lg border border-nisk bg-[var(--surface)] px-3 py-2 text-sm"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
