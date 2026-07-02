'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  Copy,
  FileText,
  Layers,
  Loader2,
  Trophy,
  Users,
  Hash,
} from 'lucide-react';
import type {
  GroupFlashcardSet,
  GroupLeaderboardEntry,
  GroupMember,
  GroupNote,
  StudyGroup,
} from '@/lib/shift-ai/groups-shared';
import { SA } from '@/lib/shift-ai/theme';

type Tab = 'notes' | 'flashcards' | 'leaderboard';

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: 'notes', label: 'Notes Board', icon: FileText },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
];

function FlashcardViewer({ set }: { set: GroupFlashcardSet }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = set.cards;
  const card = cards[index];

  if (!card) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-bold ${SA.text}`}>{set.topic}</p>
        <span className={`text-xs ${SA.muted}`}>
          by {set.author_name} · {cards.length} cards
        </span>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[140px] w-full flex-col items-center justify-center rounded-2xl bg-[var(--sa-navy-800)] p-6 text-center text-white transition-transform"
      >
        <p className="text-xs uppercase tracking-wide text-white/50">
          {flipped ? 'Back' : 'Front'} · tap to flip
        </p>
        <p className="mt-2 text-base font-medium leading-relaxed">
          {flipped ? card.back : card.front}
        </p>
      </button>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => {
            setIndex((i) => i - 1);
            setFlipped(false);
          }}
          className={SA.btnSecondary}
        >
          Previous
        </button>
        <span className={`text-xs ${SA.muted}`}>
          {index + 1} / {cards.length}
        </span>
        <button
          type="button"
          disabled={index >= cards.length - 1}
          onClick={() => {
            setIndex((i) => i + 1);
            setFlipped(false);
          }}
          className={SA.btnSecondary}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function ShiftAiGroupDetailClient({
  group,
  currentStudentId,
  members,
  initialNotes,
  initialFlashcardSets,
  leaderboard,
}: {
  group: StudyGroup;
  currentStudentId: string;
  members: GroupMember[];
  initialNotes: GroupNote[];
  initialFlashcardSets: GroupFlashcardSet[];
  leaderboard: GroupLeaderboardEntry[];
}) {
  const [tab, setTab] = useState<Tab>('notes');
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [flashcardSets, setFlashcardSets] = useState(initialFlashcardSets);
  const [noteContent, setNoteContent] = useState('');
  const [flashTopic, setFlashTopic] = useState('');
  const [posting, setPosting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(
    initialFlashcardSets[0]?.id ?? null
  );

  const selectedSet = flashcardSets.find((s) => s.id === selectedSetId) ?? null;
  const memberNames = members.map((m) => m.full_name).filter(Boolean).join(', ');

  const copyCode = async () => {
    await navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const postNote = async () => {
    if (!noteContent.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shift-ai/groups/${group.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      });
      const data = (await res.json()) as { note?: GroupNote; error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not post note');
        return;
      }
      if (data.note) {
        setNotes((prev) => [data.note!, ...prev]);
        setNoteContent('');
      }
    } catch {
      setError('Could not post note');
    } finally {
      setPosting(false);
    }
  };

  const generateFlashcards = async () => {
    if (!flashTopic.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/shift-ai/groups/${group.id}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: flashTopic }),
      });
      const data = (await res.json()) as { set?: GroupFlashcardSet; error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not generate flashcards');
        return;
      }
      if (data.set) {
        setFlashcardSets((prev) => [data.set!, ...prev]);
        setSelectedSetId(data.set.id);
        setFlashTopic('');
      }
    } catch {
      setError('Could not generate flashcards');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={SA.content}>
      <Link
        href="/builder/shift-ai/groups"
        className={`mb-4 inline-flex items-center gap-1 text-sm ${SA.muted} hover:underline`}
      >
        <ChevronLeft className="h-4 w-4" />
        All Groups
      </Link>

      <div className={`${SA.cardPadded} mb-6 flex flex-wrap items-start justify-between gap-4`}>
        <div>
          <h1 className={`text-xl font-bold ${SA.text}`}>{group.name}</h1>
          {group.subject ? (
            <p className={`mt-0.5 text-sm ${SA.muted}`}>{group.subject}</p>
          ) : null}
          <div className={`mt-3 flex flex-wrap items-center gap-3 text-xs ${SA.muted}`}>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
            {memberNames ? <span>{memberNames}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-[var(--sa-navy-50)] px-3 py-1.5">
            <Hash className={`h-3.5 w-3.5 ${SA.muted}`} />
            <span className="font-mono text-sm font-bold tracking-widest">{group.invite_code}</span>
          </div>
          <button type="button" onClick={() => void copyCode()} className={SA.btnSecondary}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-[var(--sa-navy-50)] p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={tab === t.id ? SA.tabActive : SA.tab}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error ? <div className={`${SA.error} mb-4`}>{error}</div> : null}

      {tab === 'notes' ? (
        <div className="space-y-4">
          <div className={`${SA.cardPadded} space-y-3`}>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Share a note with your group…"
              rows={3}
              className={SA.textarea}
            />
            <button
              type="button"
              onClick={() => void postNote()}
              disabled={posting || !noteContent.trim()}
              className={SA.btnPrimary}
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Post note
            </button>
          </div>
          {notes.length === 0 ? (
            <p className={`text-center text-sm ${SA.muted}`}>No notes yet — be the first to post.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className={SA.cardPadded}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${SA.text}`}>
                    {note.author_name}
                    {note.student_id === currentStudentId ? ' (you)' : ''}
                  </span>
                  <span className={`text-xs ${SA.muted}`}>
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                </div>
                <p className={`whitespace-pre-wrap text-sm leading-relaxed ${SA.text}`}>
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === 'flashcards' ? (
        <div className="space-y-4">
          <div className={`${SA.cardPadded} space-y-3`}>
            <input
              type="text"
              value={flashTopic}
              onChange={(e) => setFlashTopic(e.target.value)}
              placeholder="Topic for AI flashcards…"
              className={SA.input}
            />
            <button
              type="button"
              onClick={() => void generateFlashcards()}
              disabled={generating || !flashTopic.trim()}
              className={SA.btnPrimary}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              Generate shared deck
            </button>
          </div>
          {flashcardSets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {flashcardSets.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSetId(s.id)}
                  className={
                    selectedSetId === s.id
                      ? 'rounded-lg bg-[var(--sa-navy-800)] px-3 py-1.5 text-xs font-medium text-white'
                      : `${SA.btnSecondary} text-xs`
                  }
                >
                  {s.topic}
                </button>
              ))}
            </div>
          ) : null}
          {selectedSet ? (
            <div className={SA.cardPadded}>
              <FlashcardViewer set={selectedSet} />
            </div>
          ) : (
            <p className={`text-center text-sm ${SA.muted}`}>
              No flashcard sets yet — generate one for the group.
            </p>
          )}
        </div>
      ) : null}

      {tab === 'leaderboard' ? (
        <div className={SA.cardPadded}>
          <p className={`mb-4 text-sm ${SA.muted}`}>
            Best Quiz Arcade score per member — only visible within this group.
          </p>
          {leaderboard.length === 0 ? (
            <p className={`text-center text-sm ${SA.muted}`}>
              No arcade scores yet. Play Quiz Arcade to climb the board.
            </p>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((entry, i) => (
                <li
                  key={entry.student_id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sa-navy-50)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        i === 0
                          ? 'bg-amber-400 text-amber-950'
                          : i === 1
                            ? 'bg-slate-300 text-slate-800'
                            : i === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-white text-[var(--sa-navy-800)]'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${SA.text}`}>
                        {entry.full_name}
                        {entry.student_id === currentStudentId ? ' (you)' : ''}
                      </p>
                      <p className={`text-xs ${SA.muted}`}>
                        {entry.games_played} game{entry.games_played !== 1 ? 's' : ''} played
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-[var(--sa-navy-800)]">
                    {entry.best_score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
