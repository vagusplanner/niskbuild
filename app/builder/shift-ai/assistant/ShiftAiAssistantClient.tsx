'use client';

import { useEffect, useRef, useState } from 'react';
import { GraduationCap, Loader2, Send } from 'lucide-react';
import type { ShiftChatMessage } from '@/lib/shift-ai/assistant';
import { SA } from '@/lib/shift-ai/theme';

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
    <div className={`${SA.contentNarrow} flex min-h-[calc(100vh-4rem)] flex-col`}>
      <div className="mb-6 flex items-center gap-3">
        <div className={SA.avatarLg}>
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className={SA.headingMd}>Teaching Assistant</h1>
          <p className={`text-sm ${SA.muted}`}>Your personal AI tutor for every subject</p>
        </div>
      </div>

      {subjectOptions.length > 0 ? (
        <div className="mb-4">
          <label htmlFor="assistant-subject" className={`mb-1 block text-xs ${SA.muted}`}>
            Subject context (optional)
          </label>
          <select
            id="assistant-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={`${SA.select} sm:max-w-xs`}
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

      {error ? <p className={`mb-4 ${SA.error}`}>{error}</p> : null}

      <div className={`${SA.chatPanel} min-h-[420px] flex-1`}>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {showWelcome ? (
            <div className="flex justify-start">
              <div className={`${SA.avatar} mr-2 mt-1`}>
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <div className={SA.assistBubble}>{WELCOME_MESSAGE}</div>
            </div>
          ) : null}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' ? (
                <div className={`${SA.avatar} mr-2 mt-1`}>
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
              ) : null}
              <div className={msg.role === 'user' ? SA.userBubble : SA.assistBubble}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading ? (
            <div className="flex items-center justify-start gap-2">
              <div className={SA.avatar}>
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <div className={`${SA.assistBubble} px-4 py-3`}>
                <Loader2 className={`h-4 w-4 animate-spin ${SA.muted}`} />
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 border-t border-[var(--sa-border)] p-3">
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
            className={`${SA.input} flex-1 disabled:opacity-60`}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            className={SA.btnPrimaryIcon}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
