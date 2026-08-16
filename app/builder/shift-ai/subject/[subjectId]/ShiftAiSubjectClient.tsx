'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
import type { ShiftCurriculum } from '@/lib/shift-ai/constants';
import { SA } from '@/lib/shift-ai/theme';

type SubjectTab = 'notes' | 'ai' | 'flashcards' | 'quiz' | 'videos' | 'pastpaper';

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
  curriculum: ShiftCurriculum;
};

function ComingSoonCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const t = useTranslations('subject');
  return (
    <div className={`${SA.cardPadded} text-center`}>
      <p className={`text-lg font-semibold ${SA.text}`}>{title}</p>
      <p className={`mt-2 text-sm ${SA.muted}`}>
        {description ?? t('comingSoonDefault')}
      </p>
      {children}
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
  const t = useTranslations('subject');
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
        throw new Error(data.error || t('saveError'));
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
        <p className={`text-sm ${SA.muted}`}>{t('notesHint')}</p>
        <span className={`text-xs ${SA.muted}`}>
          {status === 'saving' ? t('saving') : null}
          {status === 'saved' ? t('saved') : null}
          {status === 'error' ? t('saveFailed') : null}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => void save(content)}
        placeholder={t('notesPlaceholder')}
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
  const t = useTranslations('subject');
  const welcomeMessage = t('welcome', { subject: subjectName });

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
        throw new Error(data.error || t('sendError'));
      }

      setMessages((current) => [...current, data.userMessage!, data.assistantMessage!]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sendError'));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const showWelcome = messages.length === 0;

  return (
    <div className={`${SA.chatPanel} min-h-[420px]`}>
      {error ? <p className={`rounded-none border-b ${SA.error} px-4 py-2`}>{error}</p> : null}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {showWelcome ? (
          <div className="flex w-full">
            <div className="mr-auto flex max-w-[85%] items-start">
              <div className={`${SA.avatar} mr-2 mt-1`}>
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <div className={`${SA.assistBubble} whitespace-pre-wrap`}>{welcomeMessage}</div>
            </div>
          </div>
        ) : null}

        {messages.map((msg) => (
          <div key={msg.id} className="flex w-full">
            {msg.role === 'user' ? (
              <div className="ml-auto max-w-[85%]">
                <div className={SA.userBubble}>{msg.content}</div>
              </div>
            ) : (
              <div className="mr-auto flex max-w-[85%] items-start">
                <div className={`${SA.avatar} mr-2 mt-1`}>
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <div className={SA.assistBubble}>{msg.content}</div>
              </div>
            )}
          </div>
        ))}

        {loading ? (
          <div className="flex w-full">
            <div className="mr-auto flex items-center gap-2">
              <div className={SA.avatar}>
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <div className={`${SA.assistBubble} px-4 py-3`}>
                <Loader2 className={`h-4 w-4 animate-spin ${SA.muted}`} />
              </div>
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
          placeholder={t('placeholder', { subject: subjectName })}
          disabled={loading}
          className={`${SA.input} flex-1 disabled:opacity-60`}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!input.trim() || loading}
          className={SA.btnPrimaryIcon}
          aria-label={t('sendAria')}
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
  const t = useTranslations('subject');
  const tDash = useTranslations('dashboard');
  const [tab, setTab] = useState<SubjectTab>('notes');

  const tabs: {
    id: SubjectTab;
    label: string;
    icon: typeof BookOpen;
    comingSoon?: boolean;
    href?: (subjectName: string) => string;
  }[] = [
    { id: 'notes', label: t('tabNotes'), icon: BookOpen },
    { id: 'ai', label: t('tabAi'), icon: MessageCircle },
    { id: 'videos', label: t('tabVideos'), icon: Video, comingSoon: true },
    {
      id: 'flashcards',
      label: t('tabFlashcards'),
      icon: Layers,
      href: (name) => `/builder/shift-ai/flashcards?subject=${encodeURIComponent(name)}`,
    },
    {
      id: 'quiz',
      label: t('tabQuizzes'),
      icon: Gamepad2,
      href: (name) => `/builder/shift-ai/arcade?subject=${encodeURIComponent(name)}`,
    },
    { id: 'pastpaper', label: t('tabPastPapers'), icon: FileText, comingSoon: true },
  ];

  return (
    <div className={SA.content}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--sa-navy-100)] bg-[var(--sa-navy-50)] text-2xl">
          {subject.icon}
        </div>
        <div>
          <h1 className={SA.headingMd}>
            {subject.name}
            {subject.isFavourite ? <span className="ms-2 text-base">⭐</span> : null}
          </h1>
          <p className={`text-sm ${SA.muted}`}>
            {profile.yearGroup} · {profile.keyStage} · {tDash(`curricula.${profile.curriculum}`)}
            {subject.aiPersona ? <span className={SA.text}> · {subject.aiPersona}</span> : null}
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--sa-border)]">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          const className = active ? SA.tabActive : SA.tab;
          if (item.href) {
            return (
              <Link key={item.id} href={item.href(subject.name)} className={className}>
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={className}
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

        {tab === 'videos' ? (
          <ComingSoonCard title={t('tabVideos')} description={t('videosSoon')} />
        ) : null}
        {tab === 'pastpaper' ? (
          <ComingSoonCard title={t('tabPastPapers')} description={t('pastPapersSoon')}>
            <Link
              href={`/builder/shift-ai/content-generator?subject=${encodeURIComponent(subject.name)}&type=practice_questions`}
              className={`${SA.btnPrimary} mt-4 inline-flex`}
            >
              {t('tryPractice')}
            </Link>
          </ComingSoonCard>
        ) : null}
      </div>

      {notesUpdatedAt && tab === 'notes' ? (
        <p className={`mt-3 text-xs ${SA.muted}`}>
          {t('lastSaved', { when: new Date(notesUpdatedAt).toLocaleString() })}
        </p>
      ) : null}
    </div>
  );
}
