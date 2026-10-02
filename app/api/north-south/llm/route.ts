import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getGroqClient } from '@/lib/groq-client';
import { GROQ_CODE_MODEL } from '@/lib/groq-models';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  isGroqJsonValidationFailure,
  isGroqRateLimitError,
  llmUnstructuredResponsePayload,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';
import {
  nsApiCorsPreflightResponse,
  nsApiJson,
  withNsApiCors,
} from '@/lib/ns-api-cors';

export const maxDuration = 60;

const MAX_PROMPT_CHARS = 32_000;
const NS_GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || GROQ_CODE_MODEL;

export async function OPTIONS(request: NextRequest) {
  return nsApiCorsPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 24 });
  if (!guard.ok) return withNsApiCors(request, guard.response);

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return nsApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length < 2) {
      return nsApiJson(request, { error: 'prompt is required' }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return nsApiJson(request, { error: 'prompt is too long' }, { status: 400 });
    }

    const groq = getGroqClient();
    if (!groq) {
      return nsApiJson(request, { error: 'AI is temporarily unavailable' }, { status: 503 });
    }

    const schema =
      body.response_json_schema &&
      typeof body.response_json_schema === 'object' &&
      !Array.isArray(body.response_json_schema)
        ? body.response_json_schema
        : null;

    // Compatibility no-ops (Base44 / VP client shapes).
    void body.add_context_from_internet;
    void body.model;
    void body.file_urls;
    void body.gdpr_categories;

    const systemBase =
      'You are a helpful executive communication coach for North South Consulting. Be clear, constructive, and concise.';

    if (schema) {
      const schemaHint = JSON.stringify(schema);
      const userPrompt = `${prompt}\n\n${GROQ_JSON_ONLY_INSTRUCTION}\nRespond with JSON matching this schema:\n${schemaHint}`;
      const retryUserPrompt = `${userPrompt}\n\nIMPORTANT: Your previous attempt was rejected because it was not valid JSON. Respond with ONLY a JSON object matching the schema — no apologies or prose outside JSON.`;

      const completion = await withGroqTimeout(
        groq.chat.completions.create({
          model: NS_GROQ_MODEL,
          temperature: 0.65,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `${systemBase} When you cannot fulfill a request, still respond with valid JSON matching the requested schema.`,
            },
            { role: 'user', content: userPrompt },
          ],
        })
      );

      let content = completion.choices[0]?.message?.content?.trim() || '';
      let parsed = parseGroqJsonContent(content, 'Could not parse AI response');

      if (!parsed.ok) {
        const retry = await withGroqTimeout(
          groq.chat.completions.create({
            model: NS_GROQ_MODEL,
            temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `${systemBase} Respond with valid JSON only.`,
              },
              { role: 'user', content: retryUserPrompt },
            ],
          })
        );
        content = retry.choices[0]?.message?.content?.trim() || '';
        parsed = parseGroqJsonContent(content, 'Could not parse AI response');
      }

      if (!parsed.ok) {
        logGroqParseFailure('ns-llm', content, parsed.error);
        return nsApiJson(request, llmUnstructuredResponsePayload(), { status: 422 });
      }

      return nsApiJson(request, parsed.json);
    }

    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: NS_GROQ_MODEL,
        temperature: 0.65,
        messages: [
          { role: 'system', content: systemBase },
          { role: 'user', content: prompt },
        ],
      })
    );

    const text = completion.choices[0]?.message?.content?.trim() || '';
    if (!text) {
      return nsApiJson(request, { error: 'Empty AI response' }, { status: 502 });
    }

    return nsApiJson(request, { text });
  } catch (error) {
    captureApiException(error);
    if (isGroqJsonValidationFailure(error)) {
      return nsApiJson(request, llmUnstructuredResponsePayload(), { status: 422 });
    }
    if (isGroqRateLimitError(error)) {
      return nsApiJson(
        request,
        {
          error: 'AI is temporarily busy due to high demand. Please try again in a moment.',
          code: 'GROQ_RATE_LIMIT',
        },
        { status: 429 }
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request';
    const status = message.toLowerCase().includes('timed out') ? 504 : 500;
    return nsApiJson(request, { error: message }, { status });
  }
}
