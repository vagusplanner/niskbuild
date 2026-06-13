import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getGroqClient } from '@/lib/groq-client';
import { computeSeoScore } from '@/lib/seo-score';
import type { SeoAiSuggestion } from '@/lib/seo-types';
import { canGenerateSeoAi } from '@/lib/tier-config';
import { createAdminClient } from '@/lib/supabase/admin';

async function getProfile(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();
  return data;
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 15 });
  if (!guard.ok) return guard.response;

  const userId = guard.user!.id;

  try {
    const profile = await getProfile(userId);
    if (!canGenerateSeoAi(profile?.subscription_tier, profile?.subscription_status)) {
      return NextResponse.json(
        { error: 'AI SEO generation requires an active Pro plan or above.', upgrade: true },
        { status: 403 }
      );
    }

    const { prompt, pageContent, blueprint } = await request.json();
    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    }

    const systemPrompt = `You are an SEO expert. Return ONLY valid JSON with keys: title (max 60 chars), metaDescription (max 160 chars), focusKeyword, ogTitle, ogDescription, suggestedSchema (JSON-LD object with @context and @type). No markdown.`;

    const userPrompt = `App description: ${prompt || 'Web app'}
Blueprint: ${blueprint ? JSON.stringify(blueprint).slice(0, 2000) : 'none'}
Page content excerpt: ${String(pageContent || '').slice(0, 3000)}

Generate optimised SEO metadata. Make it compelling and keyword-rich.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI returned invalid SEO data' }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as SeoAiSuggestion;
    const score = computeSeoScore({
      title: parsed.title || '',
      metaDescription: parsed.metaDescription || '',
      focusKeyword: parsed.focusKeyword || '',
      ogImageUrl: '',
      schemaJson: parsed.suggestedSchema || null,
    }).total;

    return NextResponse.json({
      suggestion: parsed,
      seoScore: score,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
