import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { deductCloudCredit } from '@/lib/credits';
import { canSpendCloudCredits, outOfCreditsMessage } from '@/lib/credits-init';
import { getGroqClient } from '@/lib/groq-client';
import { streamBuildNarration } from '@/lib/generate-narration';
import { canUseOwnApiKeys } from '@/lib/tier-config';

const CODE_SYSTEM_PROMPT = `You are an expert web developer. Generate ONLY complete HTML/CSS/JavaScript code. 
No explanations. No markdown. Start directly with <!DOCTYPE html>. 
Make it responsive, modern, and visually appealing. Use Tailwind CSS when appropriate.`;

async function getUserProfile(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, use_own_api_keys, openai_api_key, anthropic_api_key')
    .eq('id', userId)
    .single();
  return data;
}

function sseLine(encoder: TextEncoder, payload: Record<string, unknown> | string): Uint8Array {
  const body =
    typeof payload === 'string' ? payload : JSON.stringify(payload);
  return encoder.encode(`data: ${body}\n\n`);
}

/** SSE: live narration (plain English) then code tokens for preview */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { prompt } = await request.json();
  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
  }

  const profile = await getUserProfile(guard.user.id);
  const tier = profile?.subscription_tier || 'free';
  const status = profile?.subscription_status || 'inactive';

  if (!canSpendCloudCredits(tier, status)) {
    return new Response(JSON.stringify({ error: outOfCreditsMessage(tier, status) }), {
      status: 403,
    });
  }

  const byocAllowed = canUseOwnApiKeys(tier);
  const useOwnKeys = byocAllowed && !!profile?.use_own_api_keys;
  const hasUserKeys = !!(profile?.openai_api_key || profile?.anthropic_api_key);
  const skipCredits = useOwnKeys && hasUserKeys;

  if (!skipCredits) {
    const creditResult = await deductCloudCredit(guard.user.id);
    if (!creditResult.ok) {
      return new Response(JSON.stringify({ error: creditResult.error || 'Insufficient credits' }), {
        status: 402,
      });
    }
  }

  const groq = getGroqClient();
  if (!groq) {
    return new Response(JSON.stringify({ error: 'Groq API key not configured' }), { status: 503 });
  }

  const encoder = new TextEncoder();

  const body = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown> | string) => {
        controller.enqueue(sseLine(encoder, payload));
      };

      try {
        await streamBuildNarration(
          prompt,
          'html',
          (accumulated) => {
            send({ kind: 'narration', text: accumulated });
          }
        );

        send({ kind: 'status', text: 'Generating your app — preview will update when ready…' });

        const codeStream = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: CODE_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        });

        for await (const chunk of codeStream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) {
            send({ kind: 'code', text });
          }
        }

        send('[DONE]');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream failed';
        send({ error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
