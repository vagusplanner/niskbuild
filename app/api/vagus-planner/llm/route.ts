import { NextRequest, NextResponse } from 'next/server';
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

const MAX_PROMPT_CHARS = 32_000;

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 24 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length < 2) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json({ error: 'prompt is too long' }, { status: 400 });
    }

    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json(
        { error: 'AI is temporarily unavailable' },
        { status: 503 }
      );
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
        return NextResponse.json({ error: parsed.error }, { status: 502 });
      }

      return NextResponse.json(parsed.json);
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
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    captureApiException(error);
    const message =
      error instanceof Error ? error.message : 'Failed to process AI request';
    const status = message.toLowerCase().includes('timed out') ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
