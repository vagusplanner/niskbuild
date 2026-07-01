'use client';

import { useEffect, useRef, useState } from 'react';
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
import { SA } from '@/lib/shift-ai/theme';

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
    <div className={`${SA.cardPadded} text-center`}>
      <p className={`text-lg font-semibold ${SA.text}`}>{title}</p>
      <p className={`mt-2 text-sm ${SA.muted}`}>Coming in the next update</p>
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
        <p className={`text-sm ${SA.muted}`}>
          Jot down ideas, formulas, and reminders for this subject.
        </p>
        <span className={`text-xs ${SA.muted}`}>
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
        className={`${SA.textarea} resize-y rounded-2xl`}
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
    <div className={`${SA.chatPanel} min-h-[420px]`}>
      {error ? <p className={`border-b ${SA.error} rounded-none px-4 py-2`}>{error}</p> : null}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {showWelcome ? (
          <div className="flex justify-start">
            <div className={`${SA.avatar} mr-2 mt-1`}>
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
            <div className={SA.assistBubble}>{welcomeMessage}</div>
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
          placeholder={`Ask about ${subjectName}…`}
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
    <div className={SA.content}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--sa-navy-100)] bg-[var(--sa-navy-50)] text-2xl">
          {subject.icon}
        </div>
        <div>
          <h1 className={SA.headingMd}>
            {subject.name}
            {subject.isFavourite ? <span className="ml-2 text-base">⭐</span> : null}
          </h1>
          <p className={`text-sm ${SA.muted}`}>
            {profile.yearGroup} · {profile.keyStage} · {profile.curriculumLabel}
            {subject.aiPersona ? <span className={SA.text}> · {subject.aiPersona}</span> : null}
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--sa-border)]">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={active ? SA.tabActive : SA.tab}
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
        <p className={`mt-3 text-xs ${SA.muted}`}>
          Last saved {new Date(notesUpdatedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
