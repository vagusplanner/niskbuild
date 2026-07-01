'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Loader2, Send } from 'lucide-react';
import type { ShiftChatMessage } from '@/lib/shift-ai/assistant';

const WELCOME_MESSAGE =
  "Hello! I'm your personal Teaching Assistant.\n\nI can help you with any subject, explain concepts, quiz you, help with homework, or answer questions. What would you like to learn today?";

export default function ShiftAiAssistantClient({
  initialMessages,
  subjectOptions,
}: {
  initialMessages: ShiftChatMessage[];
  subjectOptions: string[];
}) {
  const [messages, setMessages] = useState<ShiftChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/shift-ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: text,
          subject: subject || null,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        userMessage?: ShiftChatMessage;
        assistantMessage?: ShiftChatMessage;
      };

      if (!res.ok || !data.userMessage || !data.assistantMessage) {
        throw new Error(data.error || 'Could not send message');
      }

      setMessages((current) => [...current, data.userMessage!, data.assistantMessage!]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message');
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const showWelcome = messages.length === 0;

  return (
    <main className="min-h-screen bg-[#1a1612] text-[#e8dcc8]">
      <div className="mx-auto flex h-screen max-w-3xl flex-col p-6 md:p-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#857664]/30">
              <GraduationCap className="h-6 w-6 text-[#e8dcc8]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#e8dcc8]">Teaching Assistant</h1>
              <p className="text-sm text-[#857664]">Your personal AI tutor for every subject</p>
            </div>
          </div>
          <Link
            href="/builder/shift-ai/dashboard"
            className="text-sm text-[#857664] hover:text-[#e8dcc8]"
          >
            Dashboard
          </Link>
        </div>

        {subjectOptions.length > 0 ? (
          <div className="mb-4">
            <label htmlFor="assistant-subject" className="mb-1 block text-xs text-[#857664]">
              Subject context (optional)
            </label>
            <select
              id="assistant-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-[#857664]/40 bg-[#1a1612] px-3 py-2 text-sm text-[#e8dcc8] sm:max-w-xs"
            >
              <option value="">Any subject</option>
              {subjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-[#e8dcc8]">
            {error}
          </p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#857664]/30 bg-[#1a1612]">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {showWelcome ? (
              <div className="flex justify-start">
                <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#857664]/30">
                  <GraduationCap className="h-3.5 w-3.5 text-[#e8dcc8]" />
                </div>
                <div className="max-w-[78%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-[#857664]/30 bg-[#1a1612] px-4 py-3 text-sm leading-relaxed text-[#e8dcc8]">
                  {WELCOME_MESSAGE}
                </div>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' ? (
                  <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#857664]/30">
                    <GraduationCap className="h-3.5 w-3.5 text-[#e8dcc8]" />
                  </div>
                ) : null}
                <div
                  className={`max-w-[78%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-2xl rounded-br-sm bg-[#9a6530] text-[#1a1612]'
                      : 'rounded-2xl rounded-bl-sm border border-[#857664]/30 bg-[#1a1612] text-[#e8dcc8]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex items-center justify-start gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#857664]/30">
                  <GraduationCap className="h-3.5 w-3.5 text-[#e8dcc8]" />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-[#857664]/30 bg-[#1a1612] px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-[#857664]" />
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t border-[#857664]/30 p-3">
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
              placeholder="Ask me anything..."
              disabled={loading}
              className="flex-1 rounded-lg border border-[#857664]/40 bg-[#1a1612] px-3 py-2 text-sm text-[#e8dcc8] placeholder:text-[#857664] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim() || loading}
              className="inline-flex items-center justify-center rounded-lg bg-[#9a6530] px-3 py-2 text-[#1a1612] hover:opacity-90 disabled:opacity-60"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
