'use client';

export type SpeechSupportLevel = 'full' | 'partial-ios' | 'synthesis-only' | 'none';

export type SpeechSupport = {
  level: SpeechSupportLevel;
  recognition: boolean;
  synthesis: boolean;
  browserLabel: string;
  isIosSafari: boolean;
  message: string | null;
};

export type SpeakOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  onEnd?: () => void;
};

export const LISTEN_NO_SPEECH_MESSAGE =
  "I didn't hear anything — try speaking a bit louder!";
export const LISTEN_TIMEOUT_MS = 8000;
export const MIC_READY_DELAY_MS = 500;

export const IOS_VOICE_FALLBACK_HINT =
  'Voice input can be unreliable on iPhone. You can also type your answer below.';

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
  onend: (() => void) | null;
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

/** True for Safari on iPhone/iPad — not Chrome/Firefox/Edge on iOS. */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIosDevice =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIosDevice) return false;
  if (/crios|fxios|edgios|opios/i.test(ua)) return false;
  return /safari/i.test(ua);
}

function detectBrowserLabel(): string {
  if (typeof navigator === 'undefined') return 'Unknown browser';
  if (isIosSafari()) return 'iOS Safari';
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
  const iosSafari = isIosSafari();
  const synthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const recognitionCtor = getSpeechRecognitionCtor();
  const recognition = Boolean(recognitionCtor);

  if (!synthesis && !recognition) {
    return {
      level: 'none',
      recognition: false,
      synthesis: false,
      browserLabel,
      isIosSafari: iosSafari,
      message:
        'Voice is not supported here. Ask a grown-up to help you type your answers below.',
    };
  }

  if (!recognition) {
    return {
      level: 'synthesis-only',
      recognition: false,
      synthesis,
      browserLabel,
      isIosSafari: iosSafari,
      message:
        browserLabel === 'Firefox'
          ? 'Firefox cannot hear your voice yet. You can listen to your buddy and type your answers below.'
          : 'This browser cannot hear your voice. You can listen and type your answers below.',
    };
  }

  if (iosSafari) {
    return {
      level: 'partial-ios',
      recognition: true,
      synthesis,
      browserLabel,
      isIosSafari: true,
      message: IOS_VOICE_FALLBACK_HINT,
    };
  }

  if (browserLabel === 'Safari') {
    return {
      level: 'full',
      recognition: true,
      synthesis,
      browserLabel,
      isIosSafari: false,
      message: null,
    };
  }

  return {
    level: 'full',
    recognition: true,
    synthesis,
    browserLabel,
    isIosSafari: false,
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
  if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onEnd?.();
    return;
  }

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

  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onEnd?.();

  window.speechSynthesis.speak(utterance);
}

export type ListeningSession = {
  stop: () => void;
};

export type StartListeningOptions = {
  lang?: string;
  interimResults?: boolean;
  timeoutMs?: number;
};

export function startListening(
  onResult: (transcript: string) => void,
  onError: (message: string) => void,
  options?: StartListeningOptions
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

  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const settle = (run: () => void) => {
    if (settled) return;
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    run();
  };

  recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
    const results = Array.from(event.results);
    const last = results[results.length - 1];
    if (!last?.isFinal && !options?.interimResults) return;

    const transcript = results
      .map((result) => result[0]?.transcript ?? '')
      .join('')
      .trim();

    if (transcript) {
      settle(() => onResult(transcript));
    }
  };

  recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted') {
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      return;
    }

    const friendly =
      event.error === 'not-allowed'
        ? 'Microphone access was denied. Ask a grown-up to allow the microphone, or type your answer below.'
        : event.error === 'no-speech'
          ? LISTEN_NO_SPEECH_MESSAGE
          : 'Could not hear you — please try again or type your answer below.';

    settle(() => onError(friendly));
  };

  recognition.onend = () => {
    if (!settled) {
      settle(() => onError(LISTEN_NO_SPEECH_MESSAGE));
    }
  };

  const timeoutMs = options?.timeoutMs ?? LISTEN_TIMEOUT_MS;
  timeoutId = setTimeout(() => {
    if (settled) return;
    try {
      recognition.stop();
    } catch {
      // already stopped
    }
    settle(() => onError(LISTEN_NO_SPEECH_MESSAGE));
  }, timeoutMs);

  try {
    recognition.start();
  } catch {
    settle(() => onError('Could not start listening — please try again or type your answer below.'));
    return null;
  }

  return {
    stop: () => {
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    },
  };
}
