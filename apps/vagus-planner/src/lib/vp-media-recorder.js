/**
 * iOS / Capacitor WKWebView–safe MediaRecorder helpers.
 * Safari often rejects audio/webm; forcing audio/mp4 when unsupported throws
 * before recording UI starts — looks like "Microphone does nothing".
 */

/** MIME types Safari/iOS MediaRecorder commonly accepts (prefer mp4/aac). */
const RECORDER_MIME_CANDIDATES = [
  'audio/mp4',
  'audio/aac',
  'audio/m4a',
  'audio/webm;codecs=opus',
  'audio/webm',
];

export function canUseMediaRecorder() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

/** First supported MIME, or empty string to use the browser default. */
export function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';

  for (const type of RECORDER_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // continue
    }
  }

  return '';
}

/**
 * Create a MediaRecorder that works on iPadOS/iOS WKWebView.
 * Never pass an unsupported mimeType (constructor would throw).
 */
export function createMediaRecorder(stream) {
  const mimeType = pickRecorderMimeType();
  try {
    return mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
  } catch {
    return new MediaRecorder(stream);
  }
}

export function extensionForRecorderMime(mime) {
  const type = String(mime || '').toLowerCase();
  if (type.includes('webm')) return 'webm';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  return 'm4a';
}
