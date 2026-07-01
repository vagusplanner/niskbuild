/** Client helper — read SSE from /api/cloud-generate/stream (narration + code) */

export type CloudGenerateStreamCallbacks = {
  onNarration?: (accumulated: string, delta: string) => void;
  onStatus?: (message: string) => void;
  onCodeChunk?: (accumulated: string, delta: string) => void;
};

export async function readCloudGenerateStream(
  prompt: string,
  projectId: string | null,
  callbacks: CloudGenerateStreamCallbacks | ((accumulated: string, delta: string) => void)
): Promise<{ code: string; narration: string; error?: string }> {
  const normalized: CloudGenerateStreamCallbacks =
    typeof callbacks === 'function' ? { onCodeChunk: callbacks } : callbacks;

  const res = await fetch('/api/cloud-generate/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ prompt, projectId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { code: '', narration: '', error: (data as { error?: string }).error || 'Stream failed' };
  }

  if (!res.body) {
    return { code: '', narration: '', error: 'No stream body' };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let code = '';
  let narration = '';

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
          error?: string;
        };
        if (parsed.error) return { code, narration, error: parsed.error };

        const kind = parsed.kind || 'code';
        const text = parsed.text ?? '';
        if (!text) continue;

        if (kind === 'narration') {
          narration = text;
          normalized.onNarration?.(narration, text);
        } else if (kind === 'status') {
          normalized.onStatus?.(text);
        } else {
          code += text;
          normalized.onCodeChunk?.(code, text);
        }
      } catch {
        /* ignore partial JSON */
      }
    }
  }

  return { code, narration };
}
