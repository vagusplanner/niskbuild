export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type MobileExportPayload =
  | { projectId: string }
  | {
      inline: {
        title: string;
        prompt: string;
        generated_code: string;
        blueprint_json?: unknown;
      };
    };

export async function requestPwaExport(payload: MobileExportPayload): Promise<{
  ok: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  upgrade?: boolean;
}> {
  const res = await fetch('/api/export/pwa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: err.error || 'PWA export failed',
      upgrade: err.upgrade === true,
    };
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="([^"]+)"/);
  return { ok: true, blob, filename: match?.[1] || 'app-pwa.zip' };
}

export async function requestNativeExport(payload: MobileExportPayload): Promise<{
  ok: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  upgrade?: boolean;
}> {
  const res = await fetch('/api/export/native', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: err.error || 'Native export failed',
      upgrade: err.upgrade === true,
    };
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="([^"]+)"/);
  return { ok: true, blob, filename: match?.[1] || 'app-native.zip' };
}

export function handleExportError(error: string, upgrade?: boolean): void {
  if (upgrade) {
    const go = confirm(`${error}\n\nOpen Pricing?`);
    if (go) window.location.href = '/pricing';
    return;
  }
  alert(error);
}
