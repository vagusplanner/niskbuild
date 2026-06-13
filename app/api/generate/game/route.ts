import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';
import { deductCloudCredit } from '@/lib/credits';
import { getGroqClient } from '@/lib/groq-client';
import {
  getGameTemplateCode,
  platformerTemplate,
  puzzleTemplate,
  runnerTemplate,
  type GameTemplateId,
} from '@/lib/game-templates';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseGameTemplates } from '@/lib/tier-config';

const GAME_SYSTEM_PROMPT = `You are an expert Phaser.js game developer. Generate complete, working Phaser.js 3 game code based on the description.
Always use Phaser.AUTO renderer, include preload/create/update scenes or a single scene class, and use arcade physics.
Include a score system. Make controls work on desktop (keyboard) and mobile (touch).
Return only the complete HTML file with Phaser.js loaded from CDN (https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js).
Include Restart and Fullscreen buttons that call location.reload() and requestFullscreen on #game-container.
No markdown fences. No explanations.`;

const TEMPLATE_MAP: Record<GameTemplateId, string> = {
  platformer: platformerTemplate,
  puzzle: puzzleTemplate,
  runner: runnerTemplate,
};

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
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return guard.response;

  const userId = guard.user!.id;

  try {
    const body = await request.json();
    const template = typeof body.template === 'string' ? body.template.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    const profile = await getProfile(userId);
    const tier = profile?.subscription_tier ?? 'free';
    const status = profile?.subscription_status ?? 'inactive';

    if (!canUseGameTemplates(tier, status)) {
      return NextResponse.json(
        { error: 'Agency plan required for game generation.', upgrade: true },
        { status: 403 }
      );
    }

    if (template && template in TEMPLATE_MAP) {
      const code = getGameTemplateCode(template) ?? TEMPLATE_MAP[template as GameTemplateId];
      return NextResponse.json({
        success: true,
        code,
        template,
        creditsUsed: 0,
      });
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Provide a template id or a game description prompt.' },
        { status: 400 }
      );
    }

    const creditResult = await deductCloudCredit(userId);
    if (!creditResult.ok) {
      return NextResponse.json(
        { error: creditResult.error || 'Insufficient cloud credits' },
        { status: 402 }
      );
    }

    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json(
        { error: 'AI provider not configured for game generation.' },
        { status: 503 }
      );
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: GAME_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 8192,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const code = cleanGeneratedCode(raw);

    if (!code || code.length < 100) {
      return NextResponse.json({ error: 'Failed to generate valid game code' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      code,
      template: 'custom',
      creditsRemaining: creditResult.remaining,
      creditsUsed: 1,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to generate game');
  }
}
