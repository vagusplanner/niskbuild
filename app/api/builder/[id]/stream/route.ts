import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import {
  applyBuilderAppEdit,
  resolveBuilderApp,
} from '@/lib/builder-apps/handlers';
import { streamBuildNarration } from '@/lib/generate-narration';

type RouteContext = { params: Promise<{ id: string }> };

function sseLine(encoder: TextEncoder, payload: Record<string, unknown> | string): Uint8Array {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return encoder.encode(`data: ${body}\n\n`);
}

/** SSE: live narration then VP/React edit result */
export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  const { id: appId } = await context.params;
  const app = resolveBuilderApp(appId);
  if (!app) {
    return new Response(JSON.stringify({ error: 'Unknown builder app' }), { status: 404 });
  }

  const body = await request.json();
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const targetId = typeof body.targetId === 'string' ? body.targetId : app.defaultTargetId;
  const useLocal = body.useLocal === true;

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
  }

  const target = app.getTargetById(targetId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown> | string) => {
        controller.enqueue(sseLine(encoder, payload));
      };

      try {
        await streamBuildNarration(
          prompt,
          'vp',
          (accumulated) => {
            send({ kind: 'narration', text: accumulated });
          },
          target ? `Editing ${target.label} (${target.file})` : undefined
        );

        send({ kind: 'status', text: 'Applying changes to your app source…' });

        const result = await applyBuilderAppEdit({
          app,
          userId: guard.user!.id,
          prompt,
          targetId,
          useLocal,
        });

        if (!('success' in result) || !result.success) {
          send({
            kind: 'result',
            result: {
              error: 'error' in result ? result.error : 'Edit failed',
              upgrade: 'upgrade' in result ? result.upgrade : undefined,
            },
          });
        } else {
          send({ kind: 'result', result });
        }

        send('[DONE]');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Builder stream failed';
        send({ error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
