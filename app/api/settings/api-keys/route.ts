import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { canUseOwnApiKeys } from '@/lib/tier-config';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const user = guard.user!;

  const { data: profile } = await supabase
    .from('profiles')
    .select('openai_api_key, anthropic_api_key, use_own_api_keys, subscription_tier')
    .eq('id', user.id)
    .single();

  const byocAllowed = canUseOwnApiKeys(profile?.subscription_tier);

  return NextResponse.json({
    hasOpenAI: !!profile?.openai_api_key,
    hasAnthropic: !!profile?.anthropic_api_key,
    useOwnKeys: byocAllowed ? (profile?.use_own_api_keys ?? false) : false,
    byocAllowed,
    byocMinTier: 'agency',
    openaiPreview: maskKey(profile?.openai_api_key),
    anthropicPreview: maskKey(profile?.anthropic_api_key),
  });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const user = guard.user!;

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (!canUseOwnApiKeys(profile?.subscription_tier)) {
    return NextResponse.json(
      {
        error: 'Bring-your-own API keys require Agency Studio ($199/mo) or higher.',
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  const { openaiApiKey, anthropicApiKey, useOwnKeys } = await request.json();

  const update: Record<string, string | boolean | null> = {
    use_own_api_keys: !!useOwnKeys,
  };

  if (openaiApiKey !== undefined) {
    update.openai_api_key = openaiApiKey?.trim() || null;
  }
  if (anthropicApiKey !== undefined) {
    update.anthropic_api_key = anthropicApiKey?.trim() || null;
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);

  if (error) {
    console.error('API keys save error:', error);
    return NextResponse.json({ error: 'Failed to save API keys' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

function maskKey(key?: string | null) {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
