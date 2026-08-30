import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  isGroqJsonValidationFailure,
  isGroqRateLimitError,
  llmUnstructuredResponsePayload,
  logGroqParseFailure,
  parseGroqJsonContent,
} from '@/lib/shift-ai/groq-json';
import {
  isAnyVpChatProviderConfigured,
  vpChatCompletion,
  vpChatCompletionJson,
} from '@/lib/vp-ai-providers';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';
import {
  VP_ART9_GROQ_UNAVAILABLE_MESSAGE,
  verifyArt9AiAccess,
} from '@/lib/vp-gdpr/art9-ai-gate';
import type { VpArt9Category } from '@/lib/vp-gdpr/tables';
import { requireFeatureUsage } from '@/lib/vp-usage-meter';

export const maxDuration = 60;

const MAX_PROMPT_CHARS = 32_000;

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 24 });
  if (!guard.ok) return withVpApiCors(request, guard.response);

  let art9Categories: VpArt9Category[] = [];

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return vpApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length < 2) {
      return vpApiJson(request, { error: 'prompt is required' }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return vpApiJson(request, { error: 'prompt is too long' }, { status: 400 });
    }

    if (!isAnyVpChatProviderConfigured()) {
      return vpApiJson(request, { error: 'AI is temporarily unavailable' }, { status: 503 });
    }

    const schema =
      body.response_json_schema &&
      typeof body.response_json_schema === 'object' &&
      !Array.isArray(body.response_json_schema)
        ? body.response_json_schema
        : null;

    // add_context_from_internet and model are accepted for API compatibility; ignored in Phase 1.
    void body.add_context_from_internet;
    void body.model;

    // Article 9 gate: callers may declare gdpr_categories: ['religious'|'health'].
    // If consent was withdrawn (or never given), refuse before forwarding to any AI provider.
    const rawCategories = Array.isArray(body.gdpr_categories)
      ? (body.gdpr_categories as unknown[])
      : [];
    const categories = rawCategories.filter(
      (c): c is VpArt9Category => c === 'religious' || c === 'health'
    );
    art9Categories = categories;
    const art9Access = await verifyArt9AiAccess(guard.user!.id, categories);
    if (!art9Access.ok) {
      return vpApiJson(
        request,
        {
          error: art9Access.error,
          code: art9Access.code,
          ...(art9Access.category ? { category: art9Access.category } : {}),
        },
        { status: art9Access.status }
      );
    }

    // Meter general AI requests against the user's plan (featureGating ai_requests).
    let userPlan = 'free';
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const usageGate = await requireFeatureUsage(admin, {
        userId: guard.user!.id,
        email: guard.user!.email,
        feature: 'ai_requests',
      });
      if (!usageGate.ok) {
        return vpApiJson(
          request,
          {
            error:
              usageGate.usage.deniedCode === 'FEATURE_LOCKED'
                ? 'AI requests are not available on your plan. Upgrade in Billing.'
                : 'Monthly AI request limit reached. Upgrade in Billing for a higher quota.',
            code: usageGate.usage.deniedCode || 'QUOTA_EXCEEDED',
            usage: usageGate.usage,
          },
          { status: 402 }
        );
      }
      userPlan = usageGate.plan;
    } catch (err) {
      console.error('VP AI usage metering failed:', err);
      return vpApiJson(
        request,
        { error: 'Unable to verify AI usage quota' },
        { status: 503 }
      );
    }

    if (schema) {
      const schemaHint = JSON.stringify(schema);
      const jsonSystemPrompt =
        'You are a helpful assistant for the Vagus Planner productivity app. Follow instructions precisely. When you cannot fulfill a request, still respond with valid JSON matching the requested schema — use null, empty arrays, or a brief explanation field if the schema allows it. Never respond with plain prose outside JSON.';
      const userPrompt = `${prompt}\n\n${GROQ_JSON_ONLY_INSTRUCTION}\nRespond with JSON matching this schema:\n${schemaHint}`;
      const retryUserPrompt = `${userPrompt}\n\nIMPORTANT: Your previous attempt was rejected because it was not valid JSON. Respond with ONLY a JSON object matching the schema — no apologies or prose outside JSON.`;

      let result = await vpChatCompletionJson(
        jsonSystemPrompt,
        userPrompt,
        {
          userTier: userPlan,
          label: 'vp-llm-json',
          temperature: 0.65,
          schemaHint,
          art9Categories: categories,
        }
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      let parsed = parseGroqJsonContent(result.content, 'Could not parse AI response');
      if (!parsed.ok) {
        const retry = await vpChatCompletion({
          messages: [
            { role: 'system', content: jsonSystemPrompt },
            { role: 'user', content: retryUserPrompt },
          ],
          userTier: userPlan,
          label: 'vp-llm-json-retry',
          temperature: 0.4,
          jsonMode: true,
          art9Categories,
        });
        if (!retry.ok) {
          throw new Error(retry.error);
        }
        parsed = parseGroqJsonContent(retry.content, 'Could not parse AI response');
      }

      if (!parsed.ok) {
        logGroqParseFailure('vp-llm', result.content, parsed.error);
        return vpApiJson(request, llmUnstructuredResponsePayload(), { status: 422 });
      }

      return vpApiJson(request, parsed.json);
    }

    const result = await vpChatCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant for the Vagus Planner productivity app. Be clear and concise.',
        },
        { role: 'user', content: prompt },
      ],
      userTier: userPlan,
      label: 'vp-llm-text',
      temperature: 0.65,
      art9Categories,
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    const text = result.content.trim();
    if (!text) {
      return vpApiJson(request, { error: 'Empty AI response' }, { status: 502 });
    }

    return vpApiJson(request, { text });
  } catch (error) {
    captureApiException(error);
    if (isGroqJsonValidationFailure(error)) {
      return vpApiJson(request, llmUnstructuredResponsePayload(), { status: 422 });
    }
    if (isGroqRateLimitError(error)) {
      return vpApiJson(
        request,
        {
          error:
            art9Categories.length > 0
              ? VP_ART9_GROQ_UNAVAILABLE_MESSAGE
              : 'AI is temporarily busy due to high demand. Please try again in a moment.',
          code: art9Categories.length > 0 ? 'VP_ART9_GROQ_ONLY_UNAVAILABLE' : 'GROQ_RATE_LIMIT',
        },
        { status: 429 }
      );
    }
    if (error instanceof Error && error.message === VP_ART9_GROQ_UNAVAILABLE_MESSAGE) {
      return vpApiJson(
        request,
        {
          error: VP_ART9_GROQ_UNAVAILABLE_MESSAGE,
          code: 'VP_ART9_GROQ_ONLY_UNAVAILABLE',
        },
        { status: 503 }
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request';
    const status = message.toLowerCase().includes('timed out') ? 504 : 500;
    return vpApiJson(request, { error: message }, { status });
  }
}
