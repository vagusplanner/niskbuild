'use client';

export type SpeechSupportLevel = 'full' | 'synthesis-only' | 'none';

export type SpeechSupport = {
  level: SpeechSupportLevel;
  recognition: boolean;
  synthesis: boolean;
  browserLabel: string;
  message: string | null;
};

export type SpeakOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  onEnd?: () => void;
};

/** Warmer, slower delivery for ages 4–7. */
export const VOICE_BUDDY_SPEAK_OPTIONS: SpeakOptions = {
  rate: 0.85,
  pitch: 1.35,
  volume: 1,
  lang: 'en-GB',
};

/** Clear, natural pace for older students. */
export const VOICE_TUTOR_SPEAK_OPTIONS: SpeakOptions = {
  rate: 0.95,
  pitch: 1.0,
  volume: 1,
  lang: 'en-GB',
};

/** Minimal Web Speech API recognition types (not in all TS lib targets). */
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionEvent = {
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
};

type BrowserSpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function detectBrowserLabel(): string {
  if (typeof navigator === 'undefined') return 'Unknown browser';
  const ua = navigator.userAgent;
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|chromium|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'This browser';
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function checkSpeechSupport(): SpeechSupport {
  const browserLabel = detectBrowserLabel();
  const synthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const recognition = Boolean(getSpeechRecognitionCtor());

  if (!synthesis && !recognition) {
    return {
      level: 'none',
      recognition: false,
      synthesis: false,
      browserLabel,
      message:
        'Voice features are not supported in this browser. Please use Chrome, Edge, or Safari on a desktop or mobile device.',
    };
  }

  if (!recognition) {
    return {
      level: 'synthesis-only',
      recognition: false,
      synthesis,
      browserLabel,
      message:
        browserLabel === 'Firefox'
          ? 'Firefox does not support speech recognition. You can hear replies, but tap-to-talk input needs Chrome, Edge, or Safari.'
          : 'Speech recognition is not available in this browser. Try Chrome, Edge, or Safari for tap-to-talk.',
    };
  }

  if (browserLabel === 'Safari') {
    return {
      level: 'full',
      recognition: true,
      synthesis,
      browserLabel,
      message:
        'Safari supports voice on most devices. If the microphone does not work, check Settings → Safari → Microphone.',
    };
  }

  return {
    level: 'full',
    recognition: true,
    synthesis,
    browserLabel,
    message: null,
  };
}

let voicesReady = false;

function ensureVoicesLoaded(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || voicesReady) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesReady = true;
    return;
  }
  window.speechSynthesis.onvoiceschanged = () => {
    voicesReady = true;
  };
}

function pickVoice(lang = 'en-GB', warmer = false): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;

  const langPrefix = lang.split('-')[0];
  const warmMatch = warmer
    ? voices.find((v) => /female|samantha|karen|moira|google uk english female/i.test(v.name))
    : undefined;

  return (
    warmMatch ||
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang.startsWith(langPrefix)) ||
    voices[0]
  );
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speak(text: string, options: SpeakOptions = {}): void {
  if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  ensureVoicesLoaded();
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;
  utterance.lang = options.lang ?? 'en-GB';

  const warmer = (options.rate ?? 1) < 0.9 || (options.pitch ?? 1) > 1.1;
  const voice = pickVoice(utterance.lang, warmer);
  if (voice) utterance.voice = voice;

  if (options.onEnd) {
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = () => options.onEnd?.();
  }

  window.speechSynthesis.speak(utterance);
}

export type ListeningSession = {
  stop: () => void;
};

export function startListening(
  onResult: (transcript: string) => void,
  onError: (message: string) => void,
  options?: { lang?: string; interimResults?: boolean }
): ListeningSession | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    onError(checkSpeechSupport().message ?? 'Speech recognition is not supported in this browser.');
    return null;
  }

  const recognition = new Ctor();
  recognition.lang = options?.lang ?? 'en-GB';
  recognition.continuous = false;
  recognition.interimResults = options?.interimResults ?? false;
  recognition.maxAlternatives = 3;

  recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
    const results = Array.from(event.results);
    const last = results[results.length - 1];
    if (!last?.isFinal && !options?.interimResults) return;

    const transcript = results
      .map((result) => result[0]?.transcript ?? '')
      .join('')
      .trim();

    if (transcript) onResult(transcript);
  };

  recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted') return;
    const friendly =
      event.error === 'not-allowed'
        ? 'Microphone access was denied. Please allow the microphone in your browser settings.'
        : event.error === 'no-speech'
          ? "I didn't hear anything — try speaking a bit louder!"
          : 'Could not hear you — please try again.';
    onError(friendly);
  };

  try {
    recognition.start();
  } catch {
    onError('Could not start listening — please try again.');
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    },
  };
}
