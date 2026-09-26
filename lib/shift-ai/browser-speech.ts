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
  /** OpenAI TTS voice id override (optional) */
  voice?: string;
  /** Prefer warmer Voice Buddy defaults when no Settings preference */
  warmer?: boolean;
  onEnd?: () => void;
};

export const LISTEN_NO_SPEECH_MESSAGE =
  "I didn't hear anything — try speaking a bit louder!";
export const LISTEN_TIMEOUT_MS = 8000;
export const MIC_READY_DELAY_MS = 500;

export const IOS_VOICE_FALLBACK_HINT =
  'Voice input can be unreliable on iPhone. You can also type your answer below.';

/** Warmer, slower delivery for younger learners (ages 7–8 family / Voice Buddy path). */
export const VOICE_BUDDY_SPEAK_OPTIONS: SpeakOptions = {
  rate: 0.9,
  pitch: 1,
  volume: 1,
  lang: 'en-GB',
  warmer: true,
};

/** Clear pace for older students — OpenAI tts-1-hd via /api/shift-ai/tts. */
export const VOICE_TUTOR_SPEAK_OPTIONS: SpeakOptions = {
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: 'en-GB',
  warmer: false,
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
let sharedAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let audioPrimed = false;
let speakGeneration = 0;

/**
 * Minimal valid silent MP3 (very short). Used only to call play() inside a user gesture
 * so the same HTMLAudioElement can later play OpenAI TTS after an async fetch.
 */
const SILENT_MP3_DATA_URL =
  'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+1DEAAAGAAGn9AAAIuAQa/8AAAAAnQAAAAgAAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.setAttribute('playsinline', 'true');
    sharedAudio.setAttribute('webkit-playsinline', 'true');
    sharedAudio.preload = 'auto';
  }
  return sharedAudio;
}

/**
 * Must be called synchronously from a click/touch handler (not after await).
 * iOS Safari only allows later audio.play() on an element that was play()'d
 * during the user gesture. Creating a new Audio() after the TTS fetch will be silent.
 */
export function primeSpeechAudio(): void {
  if (typeof window === 'undefined') return;

  const audio = getSharedAudio();
  try {
    audio.muted = false;
    audio.volume = 1;
    // Re-prime every gesture — iOS unlock is gesture-scoped.
    audio.src = SILENT_MP3_DATA_URL;
    const playResult = audio.play();
    if (playResult && typeof playResult.then === 'function') {
      void playResult
        .then(() => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // Gesture may still have unlocked the element for a later src swap
        });
    }
    audioPrimed = true;
  } catch {
    // ignore — speak() will still try
  }
}

/** @deprecated Prefer primeSpeechAudio() called synchronously from the tap handler. */
export async function unlockSpeechAudio(): Promise<void> {
  primeSpeechAudio();
}

function ensureVoicesLoaded(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || voicesReady) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesReady = true;
    return;
  }
  // iOS often fires this late or never — never block OpenAI TTS waiting for it.
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
  speakGeneration += 1;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (sharedAudio) {
    sharedAudio.onended = null;
    sharedAudio.onerror = null;
    try {
      sharedAudio.pause();
    } catch {
      // ignore
    }
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function speakWithWebSpeechFallback(text: string, options: SpeakOptions): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onEnd?.();
    return;
  }

  // iOS Safari Web Speech is unreliable (empty getVoices, missing onend).
  // Never hang the UI waiting for it — settle immediately if voices aren't ready.
  if (isIosSafari()) {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      options.onEnd?.();
      return;
    }
  }

  ensureVoicesLoaded();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;
  utterance.lang = options.lang ?? 'en-GB';

  const warmer = options.warmer === true || (options.rate ?? 1) < 0.9 || (options.pitch ?? 1) > 1.1;
  const voice = pickVoice(utterance.lang, warmer);
  if (voice) utterance.voice = voice;

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    options.onEnd?.();
  };

  utterance.onend = settle;
  utterance.onerror = settle;
  // Safety: iOS sometimes never fires onend/onerror
  window.setTimeout(settle, Math.min(20000, Math.max(4000, text.length * 80)));

  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    settle();
  }
}

/**
 * Speak via OpenAI tts-1-hd (/api/shift-ai/tts).
 * Does not wait on speechSynthesis.getVoices().
 * On iOS, call primeSpeechAudio() synchronously in the same tap handler before speak().
 * Playback reuses that primed HTMLAudioElement — never creates a new Audio after fetch.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (!text.trim()) {
    options.onEnd?.();
    return;
  }

  if (typeof window === 'undefined') {
    options.onEnd?.();
    return;
  }

  stopSpeaking();
  const generation = speakGeneration;
  // Keep using the primed element (created/play()'d during the user gesture).
  const audio = getSharedAudio();

  void (async () => {
    let settled = false;
    const settle = () => {
      if (settled || generation !== speakGeneration) return;
      settled = true;
      options.onEnd?.();
    };

    const safety = window.setTimeout(settle, 45000);

    try {
      const res = await fetch('/api/shift-ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: text.trim(),
          warmer: options.warmer === true,
          voice: options.voice || undefined,
        }),
      });

      if (generation !== speakGeneration) {
        window.clearTimeout(safety);
        return;
      }

      if (!res.ok) {
        if (isIosSafari()) {
          window.clearTimeout(safety);
          settle();
          return;
        }
        window.clearTimeout(safety);
        speakWithWebSpeechFallback(text, { ...options, onEnd: settle });
        return;
      }

      const blob = await res.blob();
      if (generation !== speakGeneration) {
        window.clearTimeout(safety);
        return;
      }

      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }

      const url = URL.createObjectURL(blob);
      currentObjectUrl = url;

      audio.onended = () => {
        window.clearTimeout(safety);
        if (currentObjectUrl === url) {
          URL.revokeObjectURL(url);
          currentObjectUrl = null;
        }
        settle();
      };
      audio.onerror = () => {
        window.clearTimeout(safety);
        if (currentObjectUrl === url) {
          URL.revokeObjectURL(url);
          currentObjectUrl = null;
        }
        if (isIosSafari()) {
          settle();
          return;
        }
        speakWithWebSpeechFallback(text, { ...options, onEnd: settle });
      };

      // Swap source on the primed element, then play — required iOS pattern.
      audio.src = url;
      audio.muted = false;
      audio.volume = 1;
      try {
        await audio.play();
        if (!audioPrimed) audioPrimed = true;
      } catch (err) {
        console.warn('[se8-tts] audio.play blocked', err);
        window.clearTimeout(safety);
        if (isIosSafari()) {
          settle();
          return;
        }
        speakWithWebSpeechFallback(text, { ...options, onEnd: settle });
      }
    } catch {
      window.clearTimeout(safety);
      if (isIosSafari()) {
        settle();
        return;
      }
      speakWithWebSpeechFallback(text, { ...options, onEnd: settle });
    }
  })();
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
