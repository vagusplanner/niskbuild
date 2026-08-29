import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  canSendArt9CategoryToAi,
  parseVpGdprConsents,
  type VpArt9Category,
} from '@/lib/vp-gdpr/tables';
import { loadUserPlanContext, requireFeatureUsage } from '@/lib/vp-usage-meter';
import { resolvePaidIslamicAccess } from '@/lib/vp-islamic-access';

export const maxDuration = 60;

const MAX_PROMPT_CHARS = 32_000;

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 24 });
  if (!guard.ok) return withVpApiCors(request, guard.response);

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

    const groq = getGroqClient();
    if (!groq) {
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
    // If consent was withdrawn (or never given), refuse before forwarding to Groq.
    const rawCategories = Array.isArray(body.gdpr_categories)
      ? (body.gdpr_categories as unknown[])
      : [];
    const categories = rawCategories.filter(
      (c): c is VpArt9Category => c === 'religious' || c === 'health'
    );
    if (categories.length > 0) {
      try {
        const admin = createAdminClient();
        const { data: settingsRows } = await admin
          .schema('firstparty')
          .from('vp_user_settings')
          .select('preferences')
          .eq('user_id', guard.user!.id)
          .limit(1);
        const consents = parseVpGdprConsents(settingsRows?.[0]?.preferences);
        for (const cat of categories) {
          if (!canSendArt9CategoryToAi(consents, cat)) {
            return vpApiJson(
              request,
              {
                error:
                  'AI processing of this data category is blocked because Article 9 consent is not active. You can update consents in Account → Privacy & Consent.',
                code: 'GDPR_ART9_CONSENT_REQUIRED',
                category: cat,
              },
              { status: 403 }
            );
          }
        }

        // Religious AI also requires a paid Islamic Edition plan (server-verified).
        if (categories.includes('religious')) {
          const { subscriptions, profile } = await loadUserPlanContext(admin, guard.user!.id);
          const islamic = resolvePaidIslamicAccess({ subscriptions, profile });
          if (!islamic.hasPaidIslamicAccess) {
            return vpApiJson(
              request,
              {
                error:
                  'Islamic AI features require an active Islamic Edition subscription. Upgrade in Billing.',
                code: 'ISLAMIC_PLAN_REQUIRED',
              },
              { status: 402 }
            );
          }
        }
      } catch (err) {
        console.error('VP GDPR consent check failed:', err);
        return vpApiJson(
          request,
          { error: 'Unable to verify privacy consents for this AI request' },
          { status: 503 }
        );
      }
    }

    // Meter general AI requests against the user's plan (featureGating ai_requests).
    try {
      const admin = createAdminClient();
      const gate = await requireFeatureUsage(admin, {
        userId: guard.user!.id,
        email: guard.user!.email,
        feature: 'ai_requests',
      });
      if (!gate.ok) {
        return vpApiJson(
          request,
          {
            error:
              gate.usage.deniedCode === 'FEATURE_LOCKED'
                ? 'AI requests are not available on your plan. Upgrade in Billing.'
                : 'Monthly AI request limit reached. Upgrade in Billing for a higher quota.',
            code: gate.usage.deniedCode || 'QUOTA_EXCEEDED',
            usage: gate.usage,
          },
          { status: 402 }
        );
      }
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
      const userPrompt = `${prompt}\n\n${GROQ_JSON_ONLY_INSTRUCTION}\nRespond with JSON matching this schema:\n${schemaHint}`;

      const completion = await withGroqTimeout(
        groq.chat.completions.create({
          model: SHIFT_GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant for the Vagus Planner productivity app. Follow instructions precisely.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.65,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        })
      );

      const raw = completion.choices[0]?.message?.content ?? '';
      const parsed = parseGroqJsonContent(raw, 'Could not parse AI response');
      if (!parsed.ok) {
        logGroqParseFailure('vp-llm', raw, parsed.error);
        return vpApiJson(request, { error: parsed.error }, { status: 502 });
      }

      return vpApiJson(request, parsed.json);
    }

    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: SHIFT_GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant for the Vagus Planner productivity app. Be clear and concise.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.65,
        max_tokens: 4096,
      })
    );

    const text = completion.choices[0]?.message?.content?.trim() ?? '';
    if (!text) {
      return vpApiJson(request, { error: 'Empty AI response' }, { status: 502 });
    }

    return vpApiJson(request, { text });
  } catch (error) {
    captureApiException(error);
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request';
    const status = message.toLowerCase().includes('timed out') ? 504 : 500;
    return vpApiJson(request, { error: message }, { status });
  }
}
