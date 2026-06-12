import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { normalizeDemographicTier } from '@/lib/demographic-tiers';
import { recordAnonymousTelemetry } from '@/lib/record-telemetry';
import { stripPersonalAttributes } from '@/lib/telemetry';

/**
 * Anonymous compilation telemetry router.
 * Strips all PII before persistence. Prompts are classified in-memory only.
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const clean = stripPersonalAttributes(body as Record<string, unknown>);

    if (clean.telemetryEnabled === false) {
      return NextResponse.json({ message: 'Telemetry disabled' });
    }

    const supabase = await createClient();
    const user = guard.user!;

    let demographicTier = normalizeDemographicTier(clean.user_demographic_tier);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('demographic_tier, telemetry_opt_out')
        .eq('id', user.id)
        .single();

      if (profile?.telemetry_opt_out) {
        return NextResponse.json({ message: 'Telemetry opted out' });
      }

      if (profile?.demographic_tier) {
        demographicTier = normalizeDemographicTier(profile.demographic_tier);
      }
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt : undefined;
    const generatedCode =
      typeof body.generatedCode === 'string'
        ? body.generatedCode
        : typeof body.code === 'string'
          ? body.code
          : undefined;

    const result = await recordAnonymousTelemetry(
      {
        prompt,
        generatedCode,
        aiModelUsed: String(clean.ai_model_used || clean.aiModelUsed || 'unknown'),
        generationSuccess: clean.generation_success !== false && clean.generationSuccess !== false,
        demographicTier,
        appVertical: typeof clean.app_vertical === 'string' ? clean.app_vertical : undefined,
        frameworkTags: Array.isArray(clean.framework_tags)
          ? (clean.framework_tags as string[])
          : Array.isArray(clean.core_stack)
            ? (clean.core_stack as string[])
            : undefined,
      },
      user?.id
    );

    if (!result.logged) {
      return NextResponse.json({ message: 'Telemetry not recorded' });
    }

    return NextResponse.json({
      success: true,
      telemetry_id: result.telemetry_id,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Telemetry failed');
  }
}
