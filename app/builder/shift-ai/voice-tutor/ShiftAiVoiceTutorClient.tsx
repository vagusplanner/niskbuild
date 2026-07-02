'use client';

import { useEffect, useRef, useState } from 'react';
import { GraduationCap, Loader2, Mic, MicOff, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  VOICE_TUTOR_SPEAK_OPTIONS,
  checkSpeechSupport,
  speak,
  startListening,
  stopSpeaking,
} from '@/lib/shift-ai/browser-speech';
import { SA } from '@/lib/shift-ai/theme';

type VoiceMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ShiftAiVoiceTutorClient({
  subjectOptions,
  yearGroup,
}: {
  subjectOptions: string[];
  yearGroup: string;
}) {
  const [speechSupport] = useState(() => checkSpeechSupport());
  const [subject, setSubject] = useState(subjectOptions[0] ?? '');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ReturnType<typeof startListening> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript, thinking]);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  const speakTutor = (text: string) => {
    if (muted || !text) return;
    setSpeaking(true);
    speak(text, {
      ...VOICE_TUTOR_SPEAK_OPTIONS,
      onEnd: () => setSpeaking(false),
    });
  };

  const beginSession = () => {
    const label = subject || 'your subjects';
    const greeting = `Hi! I'm your ${label} tutor. What would you like to work on today?`;
    setMessages([{ role: 'assistant', content: greeting }]);
    setStarted(true);
    setError('');
    window.setTimeout(() => speakTutor(greeting), 300);
  };

  const sendTranscript = async (text: string) => {
    if (!text.trim() || thinking) return;

    setThinking(true);
    setError('');
    setLiveTranscript('');

    const userMessage: VoiceMessage = { role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const res = await fetch('/api/shift-ai/voice-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: text.trim(),
          subject: subject || null,
          history: messages,
        }),
      });

      const data = (await res.json()) as { error?: string; reply?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || 'Could not get tutor reply');
      }

      const assistantMessage: VoiceMessage = { role: 'assistant', content: data.reply };
      setMessages((current) => [...current, assistantMessage]);
      speakTutor(data.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get tutor reply');
      setMessages(messages);
    } finally {
      setThinking(false);
    }
  };

  const handleListen = () => {
    if (listening) {
      sessionRef.current?.stop();
      setListening(false);
      return;
    }

    if (!speechSupport.recognition || thinking || speaking) return;

    setError('');
    stopSpeaking();
    setSpeaking(false);

    const session = startListening(
      (transcript) => {
        setLiveTranscript(transcript);
        setListening(false);
        sessionRef.current = null;
        void sendTranscript(transcript);
      },
      (message) => {
        setError(message);
        setListening(false);
        sessionRef.current = null;
      },
      { lang: 'en-GB', interimResults: true }
    );

    if (session) {
      sessionRef.current = session;
      setListening(true);
      setLiveTranscript('');
    }
  };

  const reset = () => {
    stopSpeaking();
    sessionRef.current?.stop();
    setMessages([]);
    setLiveTranscript('');
    setListening(false);
    setSpeaking(false);
    setThinking(false);
    setStarted(false);
    setError('');
  };

  const statusLabel = speaking
    ? 'Speaking…'
    : listening
      ? 'Listening…'
      : thinking
        ? 'Thinking…'
        : 'Ready';

  if (!started) {
    return (
      <div className={`${SA.contentNarrow} space-y-6`}>
        <div className="flex items-center gap-3">
          <div className={SA.iconHeader}>
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className={SA.headingMd}>Voice Tutor</h1>
            <p className={`text-sm ${SA.muted}`}>
              Speak with your AI teacher — for {yearGroup} students
            </p>
          </div>
        </div>

        {speechSupport.message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {speechSupport.message}
          </div>
        ) : null}

        {subjectOptions.length > 0 ? (
          <div className={`${SA.cardPadded} space-y-2`}>
            <label htmlFor="voice-tutor-subject" className={`block text-sm font-medium ${SA.text}`}>
              Choose a subject
            </label>
            <select
              id="voice-tutor-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={SA.select}
            >
              {subjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button type="button" onClick={beginSession} className={`${SA.btnPrimary} h-12 w-full`}>
          Start voice session
        </button>

        <p className={`text-center text-xs ${SA.muted}`}>
          Tap to talk — audio never leaves your device; only transcribed text is sent
        </p>
      </div>
    );
  }

  return (
    <div className={`${SA.contentNarrow} flex min-h-[calc(100vh-4rem)] flex-col`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={SA.headingMd}>Voice Tutor</h1>
          <p className={`text-sm ${SA.muted}`}>
            {subject || 'General'} · <span className="font-medium">{statusLabel}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className={`${SA.btnSecondary} inline-flex items-center gap-1 text-xs`}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            type="button"
            onClick={reset}
            className={`${SA.btnSecondary} inline-flex items-center gap-1 text-xs`}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      {error ? <div className={`mb-4 ${SA.error}`}>{error}</div> : null}

      <div className={`${SA.chatPanel} mb-4 min-h-[360px] flex-1`}>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
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

          {liveTranscript ? (
            <div className="flex justify-end">
              <div className="max-w-[78%] rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm italic text-blue-700">
                {liveTranscript}…
              </div>
            </div>
          ) : null}

          {thinking ? (
            <div className="flex justify-start">
              <div className={`${SA.avatar} mr-2 mt-1`}>
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <div className={`${SA.assistBubble} flex items-center gap-1`}>
                <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                <span className="text-[var(--sa-muted)]">Thinking…</span>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pb-4">
        <button
          type="button"
          onClick={handleListen}
          disabled={!speechSupport.recognition || thinking || speaking}
          className={`flex h-20 w-20 items-center justify-center rounded-full shadow-2xl transition-all ${
            listening
              ? 'bg-red-500 text-white ring-4 ring-red-300 ring-offset-2'
              : thinking || speaking || !speechSupport.recognition
                ? 'cursor-not-allowed bg-gray-200 text-gray-500 opacity-60'
                : 'bg-[var(--sa-navy-800)] text-white hover:bg-[var(--sa-navy-700)]'
          }`}
          aria-label={listening ? 'Stop recording' : 'Tap to speak'}
        >
          {listening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>
        <p className={`text-xs ${SA.muted}`}>
          {listening
            ? 'Tap to stop recording'
            : speaking
              ? 'Tutor is speaking…'
              : thinking
                ? 'Processing…'
                : 'Tap to speak'}
        </p>
      </div>
    </div>
  );
}
