'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileText,
  Gamepad2,
  GraduationCap,
  Layers,
  Loader2,
  MessageCircle,
  Send,
  Video,
} from 'lucide-react';
import type { ShiftChatMessage } from '@/lib/shift-ai/assistant';

type SubjectTab = 'notes' | 'ai' | 'flashcards' | 'quiz' | 'videos' | 'pastpaper';

const TABS: { id: SubjectTab; label: string; icon: typeof BookOpen; comingSoon?: boolean }[] = [
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'ai', label: 'AI Tutor', icon: MessageCircle },
  { id: 'videos', label: 'Videos', icon: Video, comingSoon: true },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, comingSoon: true },
  { id: 'quiz', label: 'Quizzes', icon: Gamepad2, comingSoon: true },
  { id: 'pastpaper', label: 'Past Papers', icon: FileText, comingSoon: true },
];

type SubjectInfo = {
  dbId: string;
  name: string;
  slug: string;
  icon: string;
  aiPersona: string | null;
  isFavourite: boolean;
};

type ProfileInfo = {
  yearGroup: string;
  keyStage: string;
  curriculumLabel: string;
};

function ComingSoonCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-[#857664]/30 bg-[#1a1612] p-8 text-center">
      <p className="text-lg font-semibold text-[#e8dcc8]">{title}</p>
      <p className="mt-2 text-sm text-[#857664]">Coming in the next update</p>
    </div>
  );
}

function SubjectNotesPanel({
  subjectDbId,
  initialContent,
}: {
  subjectDbId: string;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const save = async (nextContent: string) => {
    setStatus('saving');
    try {
      const res = await fetch('/api/shift-ai/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subjectId: subjectDbId,
          content: nextContent,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not save notes');
      }

      setStatus('saved');
      window.setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[#857664]">Jot down ideas, formulas, and reminders for this subject.</p>
        <span className="text-xs text-[#857664]">
          {status === 'saving' ? 'Saving…' : null}
          {status === 'saved' ? 'Saved' : null}
          {status === 'error' ? 'Save failed' : null}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => void save(content)}
        placeholder="Your notes…"
        rows={14}
        className="w-full resize-y rounded-2xl border border-[#857664]/30 bg-[#1a1612] px-4 py-3 text-sm leading-relaxed text-[#e8dcc8] placeholder:text-[#857664] focus:border-[#9a6530]/60 focus:outline-none"
      />
    </div>
  );
}

function SubjectAiChat({
  subjectName,
  initialMessages,
}: {
  subjectName: string;
  initialMessages: ShiftChatMessage[];
}) {
  const welcomeMessage = `Hi! I'm your ${subjectName} tutor.\n\nAsk me to explain concepts, walk through problems step by step, or quiz you on topics. I'll guide you — not just give answers.`;

  const [messages, setMessages] = useState<ShiftChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
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
          subject: subjectName,
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
    <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#857664]/30 bg-[#1a1612]">
      {error ? (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-[#e8dcc8]">
          {error}
        </p>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {showWelcome ? (
          <div className="flex justify-start">
            <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#857664]/30">
              <GraduationCap className="h-3.5 w-3.5 text-[#e8dcc8]" />
            </div>
            <div className="max-w-[78%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-[#857664]/30 bg-[#1a1612] px-4 py-3 text-sm leading-relaxed text-[#e8dcc8]">
              {welcomeMessage}
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
          placeholder={`Ask about ${subjectName}…`}
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
  );
}

export default function ShiftAiSubjectClient({
  subject,
  profile,
  initialNotes,
  notesUpdatedAt,
  initialMessages,
}: {
  subject: SubjectInfo;
  profile: ProfileInfo;
  initialNotes: string;
  notesUpdatedAt: string | null;
  initialMessages: ShiftChatMessage[];
}) {
  const [tab, setTab] = useState<SubjectTab>('notes');

  return (
    <main className="min-h-screen bg-[#1a1612] text-[#e8dcc8]">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#9a6530]/40 bg-[#9a6530]/15 text-2xl">
              {subject.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#e8dcc8]">
                {subject.name}
                {subject.isFavourite ? <span className="ml-2 text-base">⭐</span> : null}
              </h1>
              <p className="text-sm text-[#857664]">
                {profile.yearGroup} · {profile.keyStage} · {profile.curriculumLabel}
                {subject.aiPersona ? (
                  <span className="text-[#e8dcc8]"> · {subject.aiPersona}</span>
                ) : null}
              </p>
            </div>
          </div>
          <Link
            href="/builder/shift-ai/dashboard"
            className="text-sm text-[#857664] hover:text-[#e8dcc8]"
          >
            Dashboard
          </Link>
        </div>

        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[#857664]/30">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-b-2 border-[#9a6530] text-[#e8dcc8]'
                    : 'border-b-2 border-transparent text-[#857664] hover:text-[#e8dcc8]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div>
          {tab === 'notes' ? (
            <SubjectNotesPanel subjectDbId={subject.dbId} initialContent={initialNotes} />
          ) : null}

          {tab === 'ai' ? (
            <SubjectAiChat subjectName={subject.name} initialMessages={initialMessages} />
          ) : null}

          {tab === 'flashcards' ? <ComingSoonCard title="Flashcards" /> : null}
          {tab === 'quiz' ? <ComingSoonCard title="Quizzes" /> : null}
          {tab === 'videos' ? <ComingSoonCard title="Videos" /> : null}
          {tab === 'pastpaper' ? <ComingSoonCard title="Past Papers" /> : null}
        </div>

        {notesUpdatedAt && tab === 'notes' ? (
          <p className="mt-3 text-xs text-[#857664]">
            Last saved {new Date(notesUpdatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>
    </main>
  );
}
