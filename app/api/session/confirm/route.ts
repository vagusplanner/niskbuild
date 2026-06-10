import { NextRequest, NextResponse } from 'next/server';
import { handleSessionConfirmation } from '@/lib/session-tracker';

/**
 * Email link handler — no session auth required (token is the secret).
 * GET /api/session/confirm?token=...&action=approve|secure
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const action = request.nextUrl.searchParams.get('action');

  if (!token) {
    return htmlResponse('Missing confirmation token.', false);
  }

  if (action !== 'approve' && action !== 'secure') {
    return htmlResponse('Invalid action.', false);
  }

  const result = await handleSessionConfirmation(token, action);
  return htmlResponse(result.message, result.ok);
}

function htmlResponse(message: string, ok: boolean): NextResponse {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>NiskBuild Security</title>
<style>body{font-family:system-ui,sans-serif;background:#0B0F19;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;}
.card{max-width:420px;background:#111827;border:1px solid #1e293b;border-radius:12px;padding:32px;text-align:center;}
h1{font-size:1.25rem;color:${ok ? '#22c55e' : '#ef4444'};margin:0 0 12px;}
p{color:#94a3b8;line-height:1.6;margin:0 0 20px;}
a{color:#22d3ee;}</style></head>
<body><div class="card"><h1>${ok ? 'Done' : 'Unable to confirm'}</h1><p>${message}</p>
<a href="${process.env.NEXT_PUBLIC_APP_URL || '/'}">Return to NiskBuild</a></div></body></html>`;

  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
