'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Gamepad2, Lightbulb, Loader2, RotateCcw, Timer, Trophy, Zap } from 'lucide-react';
import {
  ARCADE_GAME_DURATION_SEC,
  type ArcadeQuestion,
  type ArcadeScoreRecord,
  computeArcadeAnswerPoints,
} from '@/lib/shift-ai/arcade-shared';
import { SA } from '@/lib/shift-ai/theme';

type Screen = 'lobby' | 'loading' | 'playing' | 'results';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function ShiftAiArcadeClient({
  subjectOptions,
  recentScores: initialScores,
}: {
  subjectOptions: string[];
  recentScores: ArcadeScoreRecord[];
}) {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [subject, setSubject] = useState(subjectOptions[0] ?? '');
  const [questions, setQuestions] = useState<ArcadeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showScaffold, setShowScaffold] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streakBonusTotal, setStreakBonusTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ARCADE_GAME_DURATION_SEC);
  const [error, setError] = useState('');
  const [recentScores, setRecentScores] = useState(initialScores);
  const [saving, setSaving] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);
  const scoreSavedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const endGame = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearTimer();
    setScreen('results');
  }, [clearTimer]);

  const saveScore = useCallback(async () => {
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;
    setSaving(true);

    try {
      const res = await fetch('/api/shift-ai/arcade/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: subject || null,
          score,
          questionsTotal: questions.length,
          questionsCorrect: correctCount,
          streakBonus: streakBonusTotal,
        }),
      });

      const data = (await res.json()) as { error?: string; score?: ArcadeScoreRecord };
      if (!res.ok || !data.score) {
        throw new Error(data.error || 'Could not save score');
      }

      setRecentScores((current) => [data.score!, ...current].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save score');
    } finally {
      setSaving(false);
    }
  }, [subject, score, questions.length, correctCount, streakBonusTotal]);

  useEffect(() => {
    if (screen === 'results' && questions.length > 0) {
      void saveScore();
    }
  }, [screen, questions.length, saveScore]);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [clearTimer, endGame]);

  const resetGameState = () => {
    endedRef.current = false;
    scoreSavedRef.current = false;
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setShowScaffold(false);
    setScore(0);
    setCorrectCount(0);
    setStreakBonusTotal(0);
    setStreak(0);
    setTimeLeft(ARCADE_GAME_DURATION_SEC);
    setError('');
  };

  const startGame = async () => {
    if (!subject) return;
    setError('');
    setScreen('loading');

    try {
      const res = await fetch('/api/shift-ai/arcade/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject }),
      });

      const data = (await res.json()) as { error?: string; questions?: ArcadeQuestion[] };
      if (!res.ok || !data.questions?.length) {
        throw new Error(data.error || 'Could not load quiz questions');
      }

      resetGameState();
      setQuestions(data.questions);
      setScreen('playing');
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start game');
      setScreen('lobby');
    }
  };

  const advanceQuestion = useCallback(() => {
    setShowScaffold(false);
    setSelected(null);
    setAnswered(false);

    setCurrentIndex((idx) => {
      const next = idx + 1;
      if (next >= questions.length) {
        endGame();
        return idx;
      }
      return next;
    });
  }, [questions.length, endGame]);

  const handleAnswer = (idx: number) => {
    if (answered || endedRef.current) return;

    const q = questions[currentIndex];
    if (!q) return;

    setSelected(idx);
    setAnswered(true);

    const isCorrect = idx === q.correctIndex;

    if (isCorrect) {
      const points = computeArcadeAnswerPoints(streak);
      setScore((s) => s + points.total);
      setStreakBonusTotal((s) => s + points.streakBonus);
      setCorrectCount((c) => c + 1);
      setStreak((s) => s + 1);
      window.setTimeout(() => advanceQuestion(), 900);
    } else {
      setStreak(0);
      setShowScaffold(true);
    }
  };

  useEffect(() => () => clearTimer(), [clearTimer]);

  const q = questions[currentIndex];
  const timerPct = (timeLeft / ARCADE_GAME_DURATION_SEC) * 100;
  const timerBarClass =
    timeLeft > 20
      ? 'bg-emerald-500'
      : timeLeft > 10
        ? 'bg-amber-400'
        : 'bg-red-500';

  if (screen === 'loading') {
    return (
      <div className={`${SA.contentNarrow} flex min-h-[60vh] flex-col items-center justify-center gap-4`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--sa-navy-800)] animate-pulse">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <p className={`text-lg font-bold ${SA.text}`}>Generating your quiz…</p>
        <p className={`text-sm ${SA.muted}`}>AI is crafting 10 questions for {subject}</p>
        <Loader2 className={`h-6 w-6 animate-spin ${SA.muted}`} />
      </div>
    );
  }

  if (screen === 'playing' && q) {
    return (
      <div className={SA.contentNarrow}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${SA.text}`}>
              Q{currentIndex + 1}/{questions.length}
            </span>
            {streak >= 2 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                🔥 {streak} streak
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold text-[var(--sa-navy-800)]">{score} pts</span>
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--sa-secondary)] px-3 py-1.5">
              <Timer className={`h-3.5 w-3.5 ${SA.muted}`} />
              <span
                className={`font-mono text-sm font-bold ${timeLeft <= 10 ? 'text-red-600' : SA.text}`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-[var(--sa-secondary)]">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timerBarClass}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        <div className="mb-4 rounded-2xl bg-[var(--sa-navy-800)] p-6 text-white">
          <p className="text-xl font-bold leading-snug">{q.question}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {q.options.map((opt, i) => {
            let cls = `${SA.card} px-4 py-3.5 text-left text-sm font-semibold transition-all hover:border-[var(--sa-navy-400)]`;
            if (answered) {
              if (i === q.correctIndex) {
                cls = 'rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3.5 text-left text-sm font-semibold text-emerald-900';
              } else if (i === selected) {
                cls = 'rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3.5 text-left text-sm font-semibold text-red-900';
              } else {
                cls = `${SA.card} px-4 py-3.5 text-left text-sm opacity-50`;
              }
            }

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleAnswer(i)}
                disabled={answered}
                className={cls}
              >
                <span className="mr-2 text-xs opacity-60">{OPTION_LABELS[i]}.</span>
                {opt}
              </button>
            );
          })}
        </div>

        {showScaffold ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-bold text-amber-900">Let&apos;s break it down</p>
            </div>
            <p className={`text-sm ${SA.text}`}>{q.socraticHint}</p>
            <p className={`mt-2 text-xs ${SA.muted}`}>
              Think about this simpler question — it guides you toward the answer without giving it
              away.
            </p>
            <button
              type="button"
              onClick={advanceQuestion}
              className={`${SA.btnPrimary} mt-4 w-full py-2.5`}
            >
              Got it — next question
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (screen === 'results') {
    const accuracy =
      questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    return (
      <div className={`${SA.contentNarrow} space-y-5 text-center`}>
        <div className="rounded-3xl bg-[var(--sa-navy-800)] p-8 text-white">
          <p className="mb-3 text-5xl">
            {correctCount === questions.length
              ? '🏆'
              : correctCount >= questions.length * 0.7
                ? '⭐'
                : '💪'}
          </p>
          <h2 className="text-3xl font-extrabold">{score} points!</h2>
          <p className="mt-1 text-white/80">
            {correctCount}/{questions.length} correct
            {streakBonusTotal > 0 ? ` · +${streakBonusTotal} streak bonus` : ''}
          </p>
          {saving ? <p className="mt-2 text-sm text-white/70">Saving score…</p> : null}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Score', value: `${score} pts`, icon: '⚡' },
            { label: 'Accuracy', value: `${accuracy}%`, icon: '🎯' },
            { label: 'Streak bonus', value: `+${streakBonusTotal}`, icon: '🔥' },
          ].map((stat) => (
            <div key={stat.label} className={`${SA.cardPadded} text-center`}>
              <p className="text-xl">{stat.icon}</p>
              <p className={`text-lg font-extrabold ${SA.text}`}>{stat.value}</p>
              <p className={`text-xs ${SA.muted}`}>{stat.label}</p>
            </div>
          ))}
        </div>

        {error ? <p className={SA.error}>{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setQuestions([]);
              setScreen('lobby');
            }}
            className={`${SA.btnSecondary} flex flex-1 items-center justify-center gap-2 py-2.5`}
          >
            <RotateCcw className="h-4 w-4" />
            Lobby
          </button>
          <button
            type="button"
            onClick={() => void startGame()}
            disabled={!subject}
            className={`${SA.btnPrimary} flex flex-1 py-2.5`}
          >
            <Zap className="h-4 w-4" />
            Play again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={SA.contentNarrow}>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--sa-navy-800)] shadow-lg">
          <Gamepad2 className="h-10 w-10 text-white" />
        </div>
        <h1 className={`text-3xl font-extrabold ${SA.text}`}>Quiz Arcade ⚡</h1>
        <p className={`mt-2 ${SA.muted}`}>
          60-second AI quiz blitz — earn streak bonuses and beat your best score
        </p>
      </div>

      <div className={`mb-6 space-y-4 ${SA.cardPadded}`}>
        <h2 className={`font-bold ${SA.text}`}>Choose your challenge</h2>

        {subjectOptions.length === 0 ? (
          <p className={`text-sm ${SA.muted}`}>
            Add favourite subjects during onboarding to play the arcade.
          </p>
        ) : (
          <>
            <div>
              <label className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={SA.select}
              >
                {subjectOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              {[
                { icon: '⚡', label: '10 Questions', desc: 'Quick fire' },
                { icon: '⏱️', label: '60 Seconds', desc: 'Beat the clock' },
                { icon: '🔥', label: 'Streak Bonus', desc: '+3 pts' },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="rounded-xl border border-[var(--sa-navy-100)] bg-[var(--sa-navy-50)] p-3"
                >
                  <p className="text-lg">{feature.icon}</p>
                  <p className="font-bold text-[var(--sa-navy-800)]">{feature.label}</p>
                  <p className="text-[var(--sa-navy-700)]">{feature.desc}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void startGame()}
              disabled={!subject}
              className={`${SA.btnPrimary} w-full py-3 text-base`}
            >
              <Zap className="h-5 w-5" />
              Start Arcade!
            </button>
          </>
        )}

        {error ? <p className={SA.error}>{error}</p> : null}
      </div>

      <div className={SA.cardPadded}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`flex items-center gap-2 font-bold ${SA.text}`}>
            <Trophy className="h-4 w-4 text-amber-500" />
            Your recent scores
          </h2>
        </div>
        {recentScores.length === 0 ? (
          <p className={`text-center text-sm ${SA.muted}`}>No scores yet — be the first!</p>
        ) : (
          <div className="space-y-2">
            {recentScores.map((row, i) => (
              <div
                key={row.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  i === 0 ? 'border border-amber-200 bg-amber-50' : 'bg-[var(--sa-secondary)]'
                }`}
              >
                <span className="w-6 text-center text-lg">{i === 0 ? '🥇' : `${i + 1}`}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${SA.text}`}>
                    {row.subject || 'General'} · {row.score} pts
                  </p>
                  <p className={`text-xs ${SA.muted}`}>
                    {row.questions_correct}/{row.questions_total} correct ·{' '}
                    {new Date(row.played_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
