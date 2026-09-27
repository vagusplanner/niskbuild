'use client';

/** Prefer MediaRecorder → Whisper on all iOS browsers (WebKit SpeechRecognition is unreliable). */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function prefersServerSpeechRecognition(): boolean {
  if (typeof window === 'undefined') return false;
  if (isIosDevice()) return true;
  const w = window as Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return !(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function canUseMediaRecorder(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

/** Pick a MIME type Safari/iOS can actually record. Prefer mp4/aac over webm. */
export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/mp4';

  const candidates = [
    'audio/mp4',
    'audio/aac',
    'audio/m4a',
    'audio/webm;codecs=opus',
    'audio/webm',
  ];

  for (const type of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // continue
    }
  }

  return 'audio/mp4';
}

function extensionForMime(mime: string): string {
  const type = mime.toLowerCase();
  if (type.includes('webm')) return 'webm';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  return 'm4a';
}

export type VoiceRecordingSession = {
  /** Stop recording and resolve with the audio blob (or null if empty/cancelled). */
  stop: () => Promise<Blob | null>;
  /** Abort without waiting for a usable blob. */
  cancel: () => void;
};

/**
 * Start push-to-talk capture. Call from a user-gesture handler.
 * Uses getUserMedia + MediaRecorder with iOS-friendly MIME types.
 */
export async function startVoiceRecording(): Promise<VoiceRecordingSession> {
  if (!canUseMediaRecorder()) {
    throw new Error('This browser cannot record audio. Please type your answer instead.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const mimeType = pickRecorderMimeType();
  const chunks: BlobPart[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch {
    recorder = new MediaRecorder(stream);
  }

  const usedMime = recorder.mimeType || mimeType || 'audio/mp4';

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  // timeslice helps Safari produce usable blobs (known Whisper/Safari quirk)
  recorder.start(1000);

  let stopped = false;

  const stopTracks = () => {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        // ignore
      }
    }
  };

  return {
    stop: () =>
      new Promise<Blob | null>((resolve) => {
        if (stopped) {
          resolve(null);
          return;
        }
        stopped = true;

        const finish = () => {
          stopTracks();
          if (chunks.length === 0) {
            resolve(null);
            return;
          }
          resolve(new Blob(chunks, { type: usedMime }));
        };

        recorder.onstop = finish;
        try {
          if (recorder.state === 'recording' || recorder.state === 'paused') {
            recorder.stop();
          } else {
            finish();
          }
        } catch {
          finish();
        }
      }),
    cancel: () => {
      if (stopped) return;
      stopped = true;
      try {
        if (recorder.state === 'recording' || recorder.state === 'paused') {
          recorder.stop();
        }
      } catch {
        // ignore
      }
      stopTracks();
      chunks.length = 0;
    },
  };
}

/**
 * Upload a recorded blob to /api/shift-ai/transcribe and return the transcript.
 */
export async function transcribeVoiceBlob(
  blob: Blob,
  options?: { language?: string }
): Promise<string> {
  const mime = blob.type || 'audio/mp4';
  const file = new File([blob], `voice.${extensionForMime(mime)}`, { type: mime });
  const form = new FormData();
  form.append('audio', file);
  if (options?.language) {
    form.append('language', options.language);
  }

  const res = await fetch('/api/shift-ai/transcribe', {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  const data = (await res.json().catch(() => ({}))) as {
    transcript?: string;
    error?: string;
    code?: string;
  };

  if (!res.ok || !data.transcript?.trim()) {
    throw new Error(
      data.error ||
        "I didn't catch that — try again, or type your answer below."
    );
  }

  return data.transcript.trim();
}
