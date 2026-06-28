import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getGroqClient } from '@/lib/groq-client';
import { logFeatureUsage } from '@/lib/feature-usage';
import {
  SOCIAL_SYSTEM_PROMPT,
  blueprintContextForSocial,
  parseSocialPosts,
} from '@/lib/social-publisher';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';
import { canCopySocialPosts } from '@/lib/tier-config';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  if (!canCopySocialPosts()) {
    return NextResponse.json({ error: 'Sign in to generate social posts.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const blueprint = (body.blueprint ?? null) as ComponentBlueprint | null;

    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SOCIAL_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Blueprint:\n${blueprintContextForSocial(blueprint, prompt)}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2500,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const posts = parseSocialPosts(raw);
    if (!posts) {
      return NextResponse.json({ error: 'Failed to parse social posts from AI response' }, { status: 502 });
    }

    void logFeatureUsage(guard.user!.id, 'social_publisher');

    return NextResponse.json({ posts });
  } catch (error) {
    return apiErrorResponse(error, 'Social post generation failed');
  }
}
