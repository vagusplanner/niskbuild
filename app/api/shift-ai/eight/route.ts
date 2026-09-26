import { NextRequest } from 'next/server';
import { resolveRequestUser } from '@/lib/shift-ai/student-auth';
import { resolveShiftPlanAccess } from '@/lib/shift-ai/plan-access';
import { retrieveSe8EightKnowledge } from '@/lib/shift-ai/eight-retrieval';
import {
  runSe8EightAgent,
  type EightMessage,
} from '@/lib/shift-ai/eight-agent';
import { isSuperEduc8Host } from '@/lib/supereduc8-host';
import {
  shiftAiApiCorsPreflightResponse,
  shiftAiApiJson,
} from '@/lib/shift-ai-api-cors';

export async function OPTIONS(request: NextRequest) {
  return shiftAiApiCorsPreflightResponse(request);
}

function parsePathname(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.length > 200) return undefined;
  return trimmed;
}

function planLabelFromAccess(access: Awaited<ReturnType<typeof resolveShiftPlanAccess>>): string {
  if (access.platformOwnerBypass) return 'platform owner';
  if (access.isPaid) return access.plan === 'family' ? 'family (paid)' : 'student (paid)';
  if (access.plan === 'trial') return 'trial';
  return 'free';
}

/**
 * POST /api/shift-ai/eight
 * Body: { message, pathname?, conversationHistory? }
 * SuperEduc8 product help assistant "8" — not AI Tutor.
 */
export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return shiftAiApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return shiftAiApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message || message.length < 2) {
    return shiftAiApiJson(request, { error: 'Message is required' }, { status: 400 });
  }
  if (message.length > 2000) {
    return shiftAiApiJson(request, { error: 'Message too long' }, { status: 400 });
  }

  const pathname = parsePathname(payload.pathname);
  const history: EightMessage[] = Array.isArray(payload.conversationHistory)
    ? payload.conversationHistory
        .filter(
          (m): m is EightMessage =>
            !!m &&
            typeof m === 'object' &&
            (m as EightMessage).role !== undefined &&
            typeof (m as EightMessage).content === 'string' &&
            ((m as EightMessage).role === 'user' || (m as EightMessage).role === 'assistant')
        )
        .slice(-6)
    : [];

  const hostHeader = request.headers.get('host') || '';
  const hostname = hostHeader.split(':')[0] || '';
  const citationHost = isSuperEduc8Host(hostname) ? hostname : undefined;

  const access = await resolveShiftPlanAccess(user.id);
  const retrieved = retrieveSe8EightKnowledge(message, {
    pathname,
    hostname: citationHost,
  });

  try {
    const result = await runSe8EightAgent(
      message,
      {
        pathname,
        hostname: citationHost,
        planLabel: planLabelFromAccess(access),
        retrievedKnowledge: retrieved.contextBlock,
      },
      history,
      retrieved.citations
    );

    return shiftAiApiJson(request, {
      ok: true,
      response: result.response,
      provider: result.provider,
      citations: result.citations ?? retrieved.citations,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Help assistant unavailable';
    console.error('[se8-eight] failed:', msg);
    return shiftAiApiJson(request, { error: msg }, { status: 500 });
  }
}
