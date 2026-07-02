'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, RotateCcw, Sparkles, Star, Volume2, VolumeX } from 'lucide-react';
import {
  VOICE_BUDDY_SPEAK_OPTIONS,
  checkSpeechSupport,
  speak,
  startListening,
  stopSpeaking,
} from '@/lib/shift-ai/browser-speech';
import type { BuddyGame } from '@/lib/shift-ai/voice-buddy';

type BuddyRound = {
  prompt: string;
  expected: string;
  praise: string;
  encouragement: string;
};

type BuddyEvaluation = {
  correct: boolean;
  message: string;
};

const MAX_ROUNDS = 5;

export default function ShiftAiVoiceBuddyClient({
  games,
  friendName,
}: {
  games: BuddyGame[];
  friendName: string;
}) {
  const [speechSupport] = useState(() => checkSpeechSupport());
  const [game, setGame] = useState<BuddyGame | null>(null);
  const [round, setRound] = useState(0);
  const [stars, setStars] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [expected, setExpected] = useState('');
  const [heard, setHeard] = useState('');
  const [feedback, setFeedback] = useState<BuddyEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const sessionRef = useRef<ReturnType<typeof startListening> | null>(null);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  const speakBuddy = (text: string) => {
    if (!muted && text) speak(text, VOICE_BUDDY_SPEAK_OPTIONS);
  };

  const loadRound = async (selectedGame: BuddyGame, roundIndex: number) => {
    setLoading(true);
    setError('');
    setFeedback(null);
    setHeard('');

    try {
      const res = await fetch('/api/shift-ai/voice-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'round',
          gameId: selectedGame.id,
          friendName,
          round: roundIndex,
        }),
      });

      const data = (await res.json()) as { error?: string; round?: BuddyRound };
      if (!res.ok || !data.round) {
        throw new Error(data.error || 'Could not start round');
      }

      setPrompt(data.round.prompt);
      setExpected(data.round.expected);
      speakBuddy(data.round.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start round');
    } finally {
      setLoading(false);
    }
  };

  const startGame = async (selectedGame: BuddyGame) => {
    stopSpeaking();
    setGame(selectedGame);
    setRound(0);
    setStars(0);
    await loadRound(selectedGame, 0);
  };

  const evaluateAnswer = async (transcript: string) => {
    if (!game || !prompt || !expected) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shift-ai/voice-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'evaluate',
          gameId: game.id,
          prompt,
          expected,
          transcript,
        }),
      });

      const data = (await res.json()) as { error?: string; evaluation?: BuddyEvaluation };
      if (!res.ok || !data.evaluation) {
        throw new Error(data.error || 'Could not check your answer');
      }

      setFeedback(data.evaluation);
      if (data.evaluation.correct) {
        setStars((s) => s + 1);
      }
      speakBuddy(data.evaluation.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check your answer');
    } finally {
      setLoading(false);
    }
  };

  const handleListen = () => {
    if (listening) {
      sessionRef.current?.stop();
      setListening(false);
      return;
    }

    if (!speechSupport.recognition) return;

    setHeard('');
    setError('');
    stopSpeaking();

    const session = startListening(
      (transcript) => {
        setHeard(transcript);
        setListening(false);
        sessionRef.current = null;
        void evaluateAnswer(transcript);
      },
      (message) => {
        setError(message);
        setListening(false);
        sessionRef.current = null;
      },
      { lang: 'en-GB' }
    );

    if (session) {
      sessionRef.current = session;
      setListening(true);
    }
  };

  const handleContinue = async () => {
    if (!game) return;

    if (round >= MAX_ROUNDS - 1) {
      stopSpeaking();
      setGame(null);
      setFeedback(null);
      return;
    }

    const nextRound = round + 1;
    setRound(nextRound);
    await loadRound(game, nextRound);
  };

  const quitGame = () => {
    stopSpeaking();
    sessionRef.current?.stop();
    setGame(null);
    setFeedback(null);
    setListening(false);
  };

  if (!game) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-10">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-5xl shadow-2xl shadow-pink-500/30">
            🐥
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--sa-navy-900)]">
            Hi! I&apos;m {friendName}! 👋
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--sa-muted)]">
            Tap a game and let&apos;s play! I&apos;ll talk to you, and you talk back. 🎤
          </p>
        </div>

        {speechSupport.message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {speechSupport.message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3">
          {games.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => void startGame(g)}
              className="flex items-center gap-4 rounded-2xl border-2 border-[var(--sa-navy-100)] bg-white p-5 text-left transition-all hover:border-pink-300 hover:bg-pink-50/50"
            >
              <span className="text-4xl" aria-hidden>
                {g.emoji}
              </span>
              <div className="flex-1">
                <p className="text-lg font-bold text-[var(--sa-navy-900)]">{g.label}</p>
                <p className="text-sm text-[var(--sa-muted)]">{g.desc}</p>
              </div>
              <Sparkles className="h-5 w-5 flex-shrink-0 text-pink-400" />
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--sa-navy-100)] px-4 py-2 text-sm font-medium text-[var(--sa-navy-800)]"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? 'Voice off' : 'Voice on'}
          </button>
        </div>

        <p className="text-center text-xs text-[var(--sa-muted)]">
          Ages 4–7 · your voice stays on your device — only text is sent to help you learn
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={quitGame}
          className="text-sm text-[var(--sa-muted)] hover:text-[var(--sa-navy-900)]"
        >
          ← Quit
        </button>
        <div className="flex items-center gap-1">
          {[...Array(MAX_ROUNDS)].map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${
                i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--sa-navy-100)]'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-[var(--sa-muted)]">
          Round {round + 1}/{MAX_ROUNDS}
        </span>
      </div>

      <div className="text-center">
        <div className="mx-auto flex h-28 w-28 animate-bounce items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-6xl shadow-xl">
          🐥
        </div>
        <p className="mt-2 text-sm text-[var(--sa-muted)]">{friendName} says…</p>
      </div>

      <div className="relative rounded-3xl border-2 border-pink-200 bg-white p-5">
        <div className="absolute -top-2 left-12 h-4 w-4 rotate-45 border-l-2 border-t-2 border-pink-200 bg-white" />
        {loading && !feedback ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
            <span className="text-sm text-[var(--sa-muted)]">{friendName} is thinking…</span>
          </div>
        ) : (
          <p className="text-lg font-medium text-[var(--sa-navy-900)]">{prompt}</p>
        )}
      </div>

      {heard ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">You said</p>
          <p className="text-sm font-medium text-[var(--sa-navy-900)]">{heard}</p>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-3xl p-5 text-center ${
            feedback.correct
              ? 'border-2 border-green-300 bg-green-50'
              : 'border-2 border-amber-300 bg-amber-50'
          }`}
        >
          <p className="mb-2 text-4xl" aria-hidden>
            {feedback.correct ? '🎉' : '💛'}
          </p>
          <p className="text-sm font-medium text-[var(--sa-navy-900)]">{feedback.message}</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!feedback && !loading ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleListen}
            disabled={!speechSupport.recognition}
            className={`flex h-24 w-24 items-center justify-center rounded-full shadow-xl transition-all ${
              listening
                ? 'bg-red-500 shadow-red-500/40'
                : speechSupport.recognition
                  ? 'bg-pink-500 shadow-pink-500/40'
                  : 'cursor-not-allowed bg-gray-300 opacity-60'
            }`}
            aria-label={listening ? 'Stop listening' : 'Tap and say your answer'}
          >
            {listening ? (
              <MicOff className="h-10 w-10 text-white" />
            ) : (
              <Mic className="h-10 w-10 text-white" />
            )}
          </button>
          <p className="text-sm font-medium text-[var(--sa-muted)]">
            {listening ? 'Listening… talk to me!' : 'Tap and say your answer'}
          </p>
        </div>
      ) : null}

      {feedback ? (
        <button
          type="button"
          onClick={() => void handleContinue()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 text-base font-bold text-white hover:bg-pink-600"
        >
          {round >= MAX_ROUNDS - 1 ? (
            <>
              Finish! <Star className="h-4 w-4" />
            </>
          ) : (
            <>
              Next question <RotateCcw className="h-4 w-4" />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
