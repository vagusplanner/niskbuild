/** Client helper — read SSE code stream from /api/cloud-generate/stream */

export async function readCloudGenerateStream(
  prompt: string,
  projectId: string | null,
  onChunk: (accumulated: string, delta: string) => void
): Promise<{ code: string; error?: string }> {
  const res = await fetch('/api/cloud-generate/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ prompt, projectId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { code: '', error: (data as { error?: string }).error || 'Stream failed' };
  }

  if (!res.body) {
    return { code: '', error: 'No stream body' };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let code = '';

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
        const parsed = JSON.parse(payload) as { text?: string; error?: string };
        if (parsed.error) return { code, error: parsed.error };
        if (parsed.text) {
          code += parsed.text;
          onChunk(code, parsed.text);
        }
      } catch {
        /* ignore partial JSON */
      }
    }
  }

  return { code };
}
