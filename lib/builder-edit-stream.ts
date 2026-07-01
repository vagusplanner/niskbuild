/** Client helper — SSE from /api/builder/[id]/stream (narration + edit result) */

export type BuilderEditStreamCallbacks = {
  onNarration?: (accumulated: string, delta: string) => void;
  onStatus?: (message: string) => void;
};

export type BuilderEditStreamResult = {
  success?: boolean;
  audit?: boolean;
  report?: string;
  auditResult?: unknown;
  source?: string;
  savedPath?: string | null;
  creditsRemaining?: number;
  error?: string;
  upgrade?: boolean;
};

export async function readBuilderEditStream(
  appId: string,
  body: { prompt: string; targetId: string; useLocal: boolean },
  callbacks: BuilderEditStreamCallbacks = {}
): Promise<BuilderEditStreamResult> {
  const res = await fetch(`/api/builder/${encodeURIComponent(appId)}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: (data as { error?: string }).error || 'Stream failed' };
  }

  if (!res.body) {
    return { error: 'No stream body' };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: BuilderEditStreamResult = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload) as {
          kind?: string;
          text?: string;
          result?: BuilderEditStreamResult;
          error?: string;
        };

        if (parsed.error) return { error: parsed.error };

        if (parsed.kind === 'narration' && parsed.text) {
          callbacks.onNarration?.(parsed.text, '');
        } else if (parsed.kind === 'status' && parsed.text) {
          callbacks.onStatus?.(parsed.text);
        } else if (parsed.kind === 'result' && parsed.result) {
          result = parsed.result;
        }
      } catch {
        /* ignore */
      }
    }
  }

  return result;
}
