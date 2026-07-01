'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Brain,
  BookOpen,
  CalendarDays,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type {
  Flashcard,
  FlashcardDeckWithCards,
  SavedNotesOption,
} from '@/lib/shift-ai/flashcards-shared';
import {
  SM2_RATINGS,
  buildReviewQueue,
  deckStats,
  forecastReviews,
  isCardDue,
  retentionEstimate,
  type ReviewCard,
  type Sm2RatingKey,
} from '@/lib/shift-ai/spaced-repetition';
import { SA } from '@/lib/shift-ai/theme';

type Tab = 'decks' | 'generate' | 'review' | 'schedule' | 'study';

function allReviewCards(decks: FlashcardDeckWithCards[]): ReviewCard[] {
  const cards: ReviewCard[] = [];
  for (const deck of decks) {
    for (const card of deck.cards) {
      cards.push({
        ...card,
        subject: deck.subject,
      });
    }
  }
  return cards;
}

function FlipCard({
  card,
  onRate,
  showRetention = false,
}: {
  card: ReviewCard;
  onRate: (rating: { key: Sm2RatingKey; quality: number }) => void;
  showRetention?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  const handleRate = (rating: { key: Sm2RatingKey; quality: number }) => {
    setFlipped(false);
    window.setTimeout(() => onRate(rating), 200);
  };

  return (
    <div className="w-full space-y-4">
      {showRetention && card._retention !== undefined ? (
        <div className={`flex items-center justify-between px-1 text-xs ${SA.muted}`}>
          <span className="flex items-center gap-1">
            <Brain className="h-3 w-3" /> Estimated retention
          </span>
          <span
            className={`font-bold ${
              card._retention >= 70
                ? 'text-emerald-600'
                : card._retention >= 40
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            {card._retention}%
          </span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative w-full cursor-pointer text-left"
        style={{ perspective: 1200 }}
      >
        <div
          className="relative min-h-52 w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div
            className="absolute inset-0 flex min-h-52 flex-col items-center justify-center rounded-2xl bg-[var(--sa-navy-800)] p-8 text-center text-white"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {card.subject ? (
              <p className="mb-2 text-xs uppercase tracking-widest text-white/40">{card.subject}</p>
            ) : null}
            <p className="mb-3 text-xs uppercase tracking-widest text-white/30">Question</p>
            <p className="text-lg font-semibold leading-relaxed">{card.front}</p>
            <p className="mt-5 text-xs text-white/25">Tap to reveal answer</p>
          </div>

          <div
            className="absolute inset-0 flex min-h-52 flex-col items-center justify-center rounded-2xl bg-emerald-800 p-8 text-center text-white"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Answer</p>
            <p className="text-lg font-semibold leading-relaxed">{card.back}</p>
          </div>
        </div>
      </button>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {SM2_RATINGS.map((rating) => (
            <button
              key={rating.key}
              type="button"
              onClick={() => handleRate(rating)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2.5 text-xs font-medium transition-all ${
                rating.key === 'again'
                  ? 'border-red-300 text-red-600 hover:bg-red-50'
                  : rating.key === 'hard'
                    ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                    : rating.key === 'good'
                      ? 'border-blue-300 text-blue-600 hover:bg-blue-50'
                      : 'border-green-300 text-green-600 hover:bg-green-50'
              }`}
            >
              <span className="text-lg">{rating.emoji}</span>
              {rating.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReviewForecast({ forecast }: { forecast: Record<string, number> }) {
  const days = Object.entries(forecast);
  const max = Math.max(...days.map(([, v]) => v), 1);

  return (
    <div className={SA.cardPadded}>
      <h3 className={`mb-3 text-sm font-bold ${SA.text}`}>📅 Upcoming review load</h3>
      <div className="flex h-16 items-end gap-1.5">
        {days.map(([date, count], i) => {
          const isToday = i === 0;
          const height = count > 0 ? Math.max(8, (count / max) * 56) : 4;
          const dayLabel = isToday
            ? 'Today'
            : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });

          return (
            <div key={date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t transition-all ${
                  isToday
                    ? 'bg-[var(--sa-navy-800)]'
                    : count > 0
                      ? 'bg-[var(--sa-navy-200)]'
                      : 'bg-[var(--sa-secondary)]'
                }`}
                style={{ height }}
              />
              <span className={`text-[9px] font-medium ${SA.muted}`}>{dayLabel}</span>
              {count > 0 ? (
                <span className="text-[9px] font-bold text-[var(--sa-navy-800)]">{count}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className={`mt-2 text-xs ${SA.muted}`}>
        Cards scheduled per day based on your learning history
      </p>
    </div>
  );
}

export default function ShiftAiFlashcardsClient({
  subjectOptions,
  initialDecks,
  savedNotes,
}: {
  subjectOptions: string[];
  initialDecks: FlashcardDeckWithCards[];
  savedNotes: SavedNotesOption[];
}) {
  const [tab, setTab] = useState<Tab>('decks');
  const [decks, setDecks] = useState(initialDecks);
  const [studyingDeck, setStudyingDeck] = useState<FlashcardDeckWithCards | null>(null);
  const [studyIdx, setStudyIdx] = useState(0);
  const [studyKnown, setStudyKnown] = useState(0);
  const [studyLater, setStudyLater] = useState(0);
  const [studyDone, setStudyDone] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [genMode, setGenMode] = useState<'topic' | 'notes' | 'saved'>('topic');
  const [genSubject, setGenSubject] = useState(subjectOptions[0] ?? '');
  const [topicInput, setTopicInput] = useState('');
  const [notesText, setNotesText] = useState('');
  const [savedNoteId, setSavedNoteId] = useState(savedNotes[0]?.subjectId ?? '');
  const [cardCount, setCardCount] = useState(12);
  const [generating, setGenerating] = useState(false);

  const allCards = useMemo(() => allReviewCards(decks), [decks]);
  const stats = useMemo(() => deckStats(allCards), [allCards]);
  const reviewQueue = useMemo(() => buildReviewQueue(allCards, 30), [allCards]);
  const forecast = useMemo(() => forecastReviews(allCards), [allCards]);

  const updateCardInDecks = useCallback((updated: Flashcard) => {
    setDecks((current) =>
      current.map((deck) =>
        deck.id === updated.deck_id
          ? {
              ...deck,
              cards: deck.cards.map((c) => (c.id === updated.id ? updated : c)),
            }
          : deck
      )
    );
    setStudyingDeck((current) =>
      current && current.id === updated.deck_id
        ? {
            ...current,
            cards: current.cards.map((c) => (c.id === updated.id ? updated : c)),
          }
        : current
    );
  }, []);

  const rateCard = async (card: ReviewCard, rating: { key: Sm2RatingKey; quality: number }) => {
    try {
      const res = await fetch(`/api/shift-ai/flashcards/cards/${card.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating: rating.key }),
      });
      const data = (await res.json()) as { error?: string; card?: Flashcard };
      if (!res.ok || !data.card) {
        throw new Error(data.error || 'Could not save review');
      }
      updateCardInDecks(data.card);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review');
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    try {
      const res = await fetch(`/api/shift-ai/flashcards/decks/${deckId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not delete deck');
      setDecks((current) => current.filter((d) => d.id !== deckId));
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete deck');
    }
  };

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);

    try {
      const payload: Record<string, unknown> = {
        subject: genSubject || 'General',
        cardCount,
      };

      if (genMode === 'topic') {
        if (!topicInput.trim()) return;
        payload.mode = 'topic';
        payload.content = topicInput.trim();
      } else if (genMode === 'notes') {
        if (!notesText.trim()) return;
        payload.mode = 'notes';
        payload.content = notesText.trim();
      } else {
        if (!savedNoteId) return;
        payload.noteSubjectId = savedNoteId;
        payload.mode = 'notes';
      }

      const res = await fetch('/api/shift-ai/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        error?: string;
        deck?: FlashcardDeckWithCards;
      };

      if (!res.ok || !data.deck) {
        throw new Error(data.error || 'Could not generate deck');
      }

      setDecks((current) => [data.deck!, ...current]);
      setTopicInput('');
      setNotesText('');
      setTab('decks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate deck');
    } finally {
      setGenerating(false);
    }
  };

  const startStudyDeck = (deck: FlashcardDeckWithCards) => {
    setStudyingDeck(deck);
    setStudyIdx(0);
    setStudyKnown(0);
    setStudyLater(0);
    setStudyDone(false);
    setTab('study');
  };

  const handleStudyRate = async (rating: { key: Sm2RatingKey; quality: number }) => {
    const deck = studyingDeck;
    if (!deck) return;
    const card = deck.cards[studyIdx];
    if (!card) return;

    if (rating.quality >= 3) setStudyKnown((n) => n + 1);
    else setStudyLater((n) => n + 1);

    await rateCard({ ...card, subject: deck.subject }, rating);

    if (studyIdx + 1 >= deck.cards.length) {
      setStudyDone(true);
    } else {
      setStudyIdx((i) => i + 1);
    }
  };

  const handleReviewRate = async (rating: { key: Sm2RatingKey; quality: number }) => {
    const card = reviewQueue[reviewIdx];
    if (!card) return;
    await rateCard(card, rating);
    if (reviewIdx + 1 >= reviewQueue.length) setReviewDone(true);
    else setReviewIdx((i) => i + 1);
  };

  const TABS = [
    { id: 'decks' as const, label: 'My Decks', emoji: '📚' },
    { id: 'generate' as const, label: 'Build Deck', emoji: '✨' },
    {
      id: 'review' as const,
      label: `Daily Review${stats.due ? ` (${stats.due})` : ''}`,
      emoji: '🔁',
    },
    { id: 'schedule' as const, label: 'Schedule', emoji: '📅' },
  ];

  const canGenerate =
    genMode === 'topic'
      ? topicInput.trim().length > 0
      : genMode === 'notes'
        ? notesText.trim().length > 0
        : savedNoteId.length > 0;

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`flex items-center gap-2 text-2xl font-bold ${SA.text}`}>
          <Brain className="h-6 w-6 text-[var(--sa-navy-800)]" />
          Smart Flashcards
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          Build decks from any topic or notes · SM-2 spaced repetition engine
        </p>
      </div>

      {allCards.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {
              label: 'Due Today',
              value: stats.due,
              icon: '🔁',
              color: stats.due > 0 ? 'text-rose-600' : 'text-emerald-600',
            },
            { label: 'Total Cards', value: stats.total, icon: '🃏', color: SA.text },
            { label: 'Decks', value: decks.length, icon: '📚', color: 'text-[var(--sa-navy-800)]' },
            {
              label: 'Avg Retention',
              value: `${stats.avgRetention}%`,
              icon: '🧠',
              color:
                stats.avgRetention >= 70
                  ? 'text-emerald-600'
                  : stats.avgRetention >= 40
                    ? 'text-amber-600'
                    : 'text-red-600',
            },
          ].map((stat) => (
            <div key={stat.label} className={`${SA.cardPadded} text-center`}>
              <p className="text-lg">{stat.icon}</p>
              <p className={`text-base font-extrabold ${stat.color}`}>{stat.value}</p>
              <p className={`text-[10px] leading-tight ${SA.muted}`}>{stat.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tab !== 'study' ? (
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--sa-secondary)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setStudyingDeck(null);
              }}
              className={`min-w-fit flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
                tab === t.id ? `${SA.card} ${SA.text} shadow-sm` : SA.muted
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className={SA.error}>{error}</p> : null}

      {tab === 'decks' ? (
        decks.length === 0 ? (
          <div className={`${SA.cardPadded} space-y-3 py-14 text-center`}>
            <p className="text-4xl">🃏</p>
            <p className={`font-bold ${SA.text}`}>No decks yet</p>
            <p className={`text-sm ${SA.muted}`}>Go to Build Deck to create your first deck</p>
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => {
              const due = deck.cards.filter((c) => isCardDue(c)).length;
              const ret = deck.cards.length
                ? Math.round(
                    deck.cards.reduce((s, c) => s + retentionEstimate(c), 0) / deck.cards.length
                  )
                : 0;

              return (
                <div key={deck.id} className={`${SA.cardPadded} flex items-center gap-4`}>
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--sa-navy-50)] text-2xl">
                    🃏
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-bold ${SA.text}`}>{deck.name}</p>
                    <div className={`mt-1 flex flex-wrap items-center gap-3 text-xs ${SA.muted}`}>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {deck.card_count} cards
                      </span>
                      {due > 0 ? (
                        <span className="flex items-center gap-1 font-semibold text-rose-600">
                          <CalendarDays className="h-3 w-3" /> {due} due
                        </span>
                      ) : null}
                      <span
                        className={`flex items-center gap-1 font-semibold ${
                          ret >= 70 ? 'text-emerald-600' : ret >= 40 ? 'text-amber-600' : SA.muted
                        }`}
                      >
                        <Brain className="h-3 w-3" /> {ret}% retention
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {confirmDelete === deck.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDeck(deck.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className={`text-xs hover:underline ${SA.muted}`}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(deck.id)}
                          className={`p-1.5 ${SA.muted} hover:text-red-600`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startStudyDeck(deck)}
                          className={`${SA.btnPrimary} gap-1.5 px-3 py-2`}
                        >
                          <Play className="h-3.5 w-3.5" /> Study
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {tab === 'study' && studyingDeck ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStudyingDeck(null);
                setTab('decks');
              }}
              className={`rounded-lg p-1.5 ${SA.muted} hover:bg-[var(--sa-secondary)]`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className={`font-bold ${SA.text}`}>{studyingDeck.name}</p>
              <p className={`text-xs ${SA.muted}`}>
                {studyingDeck.cards.length} cards · Study mode
              </p>
            </div>
          </div>

          {studyDone ? (
            <div className={`${SA.cardPadded} space-y-5 py-8 text-center`}>
              <p className="text-5xl">🎉</p>
              <p className={`text-xl font-bold ${SA.text}`}>Session complete!</p>
              <div className="mx-auto grid max-w-xs grid-cols-2 gap-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-2xl font-extrabold text-emerald-700">{studyKnown}</p>
                  <p className="text-xs font-medium text-emerald-600">Known ✓</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-2xl font-extrabold text-amber-700">{studyLater}</p>
                  <p className="text-xs font-medium text-amber-600">Review later</p>
                </div>
              </div>
              <p className={`text-sm ${SA.muted}`}>
                SM-2 has rescheduled your cards based on your ratings.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStudyIdx(0);
                  setStudyKnown(0);
                  setStudyLater(0);
                  setStudyDone(false);
                }}
                className={`${SA.btnSecondary} inline-flex items-center gap-2`}
              >
                <RotateCcw className="h-4 w-4" /> Restart
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--sa-secondary)]">
                  <div
                    className="h-full rounded-full bg-[var(--sa-navy-800)] transition-all"
                    style={{
                      width: `${(studyIdx / Math.max(studyingDeck.cards.length, 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className={`w-14 text-right text-xs font-semibold ${SA.muted}`}>
                  {studyIdx + 1} / {studyingDeck.cards.length}
                </span>
              </div>

              <FlipCard
                key={studyingDeck.cards[studyIdx]?.id}
                card={{
                  ...studyingDeck.cards[studyIdx],
                  subject: studyingDeck.subject,
                }}
                onRate={(rating) => void handleStudyRate(rating)}
                showRetention
              />

              <p className={`text-center text-xs ${SA.muted}`}>
                Tap card to flip · Rate yourself honestly · SM-2 reschedules automatically
              </p>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'generate' ? (
        <div className={`${SA.cardPadded} space-y-5`}>
          <h2 className={`font-bold ${SA.text}`}>Build a new deck</h2>

          <div>
            <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wide ${SA.muted}`}>
              Subject
            </label>
            <select
              value={genSubject}
              onChange={(e) => setGenSubject(e.target.value)}
              className={SA.select}
            >
              <option value="">General</option>
              {subjectOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1 rounded-xl bg-[var(--sa-secondary)] p-1">
            {[
              { id: 'topic' as const, label: '📝 Enter Topic' },
              { id: 'notes' as const, label: '📄 Paste Notes' },
              { id: 'saved' as const, label: '📚 Saved Notes' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setGenMode(m.id)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  genMode === m.id ? `${SA.card} ${SA.text} shadow-sm` : SA.muted
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {genMode === 'topic' ? (
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wide ${SA.muted}`}>
                Topic or concept
              </label>
              <input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Photosynthesis, The French Revolution, Quadratic equations…"
                className={SA.input}
              />
            </div>
          ) : null}

          {genMode === 'notes' ? (
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wide ${SA.muted}`}>
                Paste your notes
              </label>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Paste your notes, textbook extract, or summary here…"
                rows={7}
                className={SA.textarea}
              />
            </div>
          ) : null}

          {genMode === 'saved' ? (
            <div>
              <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wide ${SA.muted}`}>
                From subject notes
              </label>
              {savedNotes.length === 0 ? (
                <p className={`text-sm ${SA.muted}`}>
                  No saved notes yet — write notes on a subject page first.
                </p>
              ) : (
                <select
                  value={savedNoteId}
                  onChange={(e) => setSavedNoteId(e.target.value)}
                  className={SA.select}
                >
                  {savedNotes.map((note) => (
                    <option key={note.subjectId} value={note.subjectId}>
                      {note.subjectName} — {note.preview.slice(0, 40)}…
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : null}

          <div>
            <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wide ${SA.muted}`}>
              Cards to generate: <span className={SA.text}>{cardCount}</span>
            </label>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="w-full accent-[var(--sa-navy-800)]"
            />
            <div className={`mt-1 flex justify-between text-xs ${SA.muted}`}>
              <span>5 (quick)</span>
              <span>30 (comprehensive)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || !canGenerate}
            className={`${SA.btnPrimary} h-11 w-full text-base`}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating {cardCount} cards…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate deck ({cardCount} cards)
              </>
            )}
          </button>
        </div>
      ) : null}

      {tab === 'review' ? (
        stats.due === 0 ? (
          <div className={`${SA.cardPadded} space-y-4 py-12 text-center`}>
            <p className="text-5xl">🎉</p>
            <p className={`text-xl font-bold ${SA.text}`}>All caught up!</p>
            <p className={`text-sm ${SA.muted}`}>
              No cards due today. Next reviews are auto-scheduled.
            </p>
            <button
              type="button"
              onClick={() => setTab('generate')}
              className={`${SA.btnPrimary} inline-flex gap-2`}
            >
              <Sparkles className="h-4 w-4" /> Build a new deck
            </button>
          </div>
        ) : reviewDone ? (
          <div className={`${SA.cardPadded} space-y-4 py-12 text-center`}>
            <p className="text-5xl">🏆</p>
            <p className={`text-xl font-bold ${SA.text}`}>Session complete!</p>
            <p className={`text-sm ${SA.muted}`}>
              Reviewed {reviewQueue.length} cards. SM-2 has rescheduled all cards.
            </p>
            <button
              type="button"
              onClick={() => {
                setReviewIdx(0);
                setReviewDone(false);
              }}
              className={`${SA.btnSecondary} inline-flex items-center gap-2`}
            >
              <RotateCcw className="h-4 w-4" /> Reload
            </button>
          </div>
        ) : reviewQueue[reviewIdx] ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--sa-secondary)]">
                <div
                  className="h-full rounded-full bg-[var(--sa-navy-800)] transition-all"
                  style={{
                    width: `${(reviewIdx / Math.max(reviewQueue.length, 1)) * 100}%`,
                  }}
                />
              </div>
              <span className={`text-xs font-medium ${SA.muted}`}>
                {reviewIdx + 1}/{reviewQueue.length}
              </span>
            </div>

            {reviewQueue[reviewIdx]._retention !== undefined ? (
              <div
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  reviewQueue[reviewIdx]._retention! < 40
                    ? 'border border-red-200 bg-red-50 text-red-700'
                    : reviewQueue[reviewIdx]._retention! < 70
                      ? 'border border-amber-200 bg-amber-50 text-amber-700'
                      : 'border border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                {reviewQueue[reviewIdx]._retention! < 40
                  ? '⚠️ Forgetting fast — urgent review!'
                  : reviewQueue[reviewIdx]._retention! < 70
                    ? '📉 Memory fading — good time to review'
                    : '✅ Good retention — reinforcing memory'}
              </div>
            ) : null}

            <FlipCard
              key={reviewQueue[reviewIdx].id}
              card={reviewQueue[reviewIdx]}
              onRate={(rating) => void handleReviewRate(rating)}
              showRetention
            />

            <p className={`text-center text-xs ${SA.muted}`}>
              Rate how well you remembered — SM-2 reschedules accordingly
            </p>
          </div>
        ) : null
      ) : null}

      {tab === 'schedule' ? (
        <div className="space-y-4">
          <ReviewForecast forecast={forecast} />
          <div className={SA.cardPadded}>
            <h3 className={`mb-3 flex items-center gap-2 text-sm font-bold ${SA.text}`}>
              <BookOpen className="h-4 w-4" /> All cards ({allCards.length})
            </h3>
            {allCards.length === 0 ? (
              <p className={`py-6 text-center text-sm ${SA.muted}`}>No cards yet.</p>
            ) : (
              <div className="max-h-[500px] space-y-2 overflow-y-auto">
                {allCards.slice(0, 80).map((card) => {
                  const retention = retentionEstimate(card);
                  return (
                    <div
                      key={card.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--sa-navy-100)] bg-[var(--sa-secondary)] px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs font-medium ${SA.text}`}>{card.front}</p>
                        <p className={`text-[10px] ${SA.muted}`}>{card.subject || 'General'}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2 text-[10px]">
                        <span
                          className={`font-bold ${
                            retention >= 70
                              ? 'text-emerald-600'
                              : retention >= 40
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {retention}% ret.
                        </span>
                        {card.interval_days > 0 ? (
                          <span className={`rounded bg-[var(--sa-navy-50)] px-1.5 py-0.5 ${SA.muted}`}>
                            {card.interval_days}d
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
