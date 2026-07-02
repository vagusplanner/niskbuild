import 'server-only';

export const SHIFT_GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || 'llama-3.3-70b-versatile';
export const GROQ_TIMEOUT_MS = 25_000;

export const GROQ_JSON_ONLY_INSTRUCTION =
  'Respond with ONLY the raw JSON object. No markdown, no code fences, no explanation text before or after.';

export function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```\s*$/i, '');
  return cleaned.trim();
}

/** Extract the outermost JSON object or array from mixed model output. */
export function extractJsonSubstring(text: string): string {
  const cleaned = stripMarkdownFences(text);
  const objectStart = cleaned.indexOf('{');
  const arrayStart = cleaned.indexOf('[');

  if (objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)) {
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectEnd > objectStart) {
      return cleaned.slice(objectStart, objectEnd + 1);
    }
  }

  if (arrayStart >= 0) {
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayEnd > arrayStart) {
      return cleaned.slice(arrayStart, arrayEnd + 1);
    }
  }

  return cleaned;
}

export function parseGroqJsonContent(
  content: string,
  parseErrorMessage = 'Could not parse response'
): { ok: true; json: unknown } | { ok: false; error: string } {
  const candidates = [
    content.trim(),
    stripMarkdownFences(content),
    extractJsonSubstring(content),
  ];

  for (const candidate of [...new Set(candidates)]) {
    if (!candidate) continue;
    try {
      return { ok: true, json: JSON.parse(candidate) };
    } catch {
      // try next candidate
    }
  }

  return { ok: false, error: parseErrorMessage };
}

export function logGroqParseFailure(feature: string, rawContent: string, reason: string) {
  console.error(
    `Shift AI ${feature} ${reason}. Raw Groq response (truncated):`,
    rawContent.slice(0, 500)
  );
}

export function withGroqTimeout<T>(
  promise: Promise<T>,
  timeoutMessage = 'AI request timed out — please try again'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, GROQ_TIMEOUT_MS);
    }),
  ]);
}
