import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { deductCloudCredit } from '@/lib/credits';
import {
  canUseOwnApiKeys,
  canUseLocalOllama,
  isPaidAndActive,
  isSandboxTier,
} from '@/lib/tier-config';
import { generateVpSourceEdit } from '@/lib/vp-builder-ai';
import { getBuilderApp } from '@/lib/builder-apps/registry';
import type { BuilderAppDefinition } from '@/lib/builder-apps/types';

async function getUserProfile(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select(
      'subscription_tier, subscription_status, use_own_api_keys, openai_api_key, anthropic_api_key, email'
    )
    .eq('id', userId)
    .single();
  return data;
}

export function resolveBuilderApp(appId: string): BuilderAppDefinition | null {
  return getBuilderApp(appId);
}

export async function loadBuilderAppState(
  app: BuilderAppDefinition,
  targetId: string
) {
  const target = app.getTargetById(targetId) ?? app.targets[0];
  const source = await app.readSource(target.file);

  return {
    targets: app.targets,
    target,
    source,
    previewUrl: app.previewUrl,
    srcRoot: app.srcRoot,
    app: {
      id: app.id,
      name: app.name,
      supportsDeploy: app.supportsDeploy,
      supportsXcodeExport: app.supportsXcodeExport,
    },
  };
}

export async function applyBuilderAppEdit(params: {
  app: BuilderAppDefinition;
  userId: string;
  prompt: string;
  targetId: string;
  useLocal: boolean;
}) {
  const { app, userId, prompt, targetId, useLocal } = params;

  const target = app.getTargetById(targetId);
  if (!target) {
    return { error: 'Unknown edit target', status: 400 as const };
  }

  const profile = await getUserProfile(userId);
  const tier = profile?.subscription_tier || 'free';
  const status = profile?.subscription_status || 'inactive';
  const sandbox = isSandboxTier(tier);
  const localAllowed = sandbox || canUseLocalOllama(tier);

  if (!useLocal && !isPaidAndActive(tier, status)) {
    return {
      error: 'Active paid subscription required for cloud AI edits',
      upgrade: true,
      status: 403 as const,
    };
  }

  if (useLocal && !localAllowed) {
    return { error: 'Local Ollama is not available on your plan', status: 403 as const };
  }

  const byocAllowed = canUseOwnApiKeys(tier);
  const useOwnKeys = byocAllowed && !!profile?.use_own_api_keys;
  const hasUserKeys = !!(profile?.openai_api_key || profile?.anthropic_api_key);
  const skipCredits = useOwnKeys && hasUserKeys;

  let creditsRemaining: number | undefined;

  if (!useLocal && !skipCredits) {
    const creditResult = await deductCloudCredit(userId);
    if (!creditResult.ok) {
      return {
        error: creditResult.error || 'Insufficient cloud credits',
        upgrade: true,
        status: 402 as const,
      };
    }
    creditsRemaining = creditResult.remaining;
  }

  const currentSource = await app.readSource(target.file);
  const editPrompt = app.buildEditPrompt({
    userPrompt: prompt,
    relativePath: target.file,
    currentSource,
  });

  const effectiveTier = useLocal ? 'sovereign' : tier;
  const result = await generateVpSourceEdit(editPrompt, effectiveTier, {
    useOwnKeys: useLocal ? false : useOwnKeys,
    openaiKey: byocAllowed ? profile?.openai_api_key : null,
    anthropicKey: byocAllowed ? profile?.anthropic_api_key : null,
  }, app.systemPrompt);

  if (!result.success || !result.code) {
    return { error: result.error || 'AI edit failed', status: 500 as const };
  }

  const updatedSource = app.cleanSource(result.code);
  if (updatedSource.length < 80 || !/(export|import)/.test(updatedSource)) {
    return {
      error: 'AI response did not look like valid React source',
      status: 500 as const,
    };
  }

  await app.writeSource(target.file, updatedSource);

  return {
    success: true as const,
    target,
    source: updatedSource,
    provider: result.provider,
    creditsRemaining,
    usedOwnKeys: skipCredits,
    previewUrl: `${app.previewUrl}${target.route}`,
    savedPath: `${app.srcRoot}/${target.file}`,
  };
}
