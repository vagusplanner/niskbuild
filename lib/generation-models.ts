/**
 * Cloud generation model catalog — picker labels, credit costs, and provider API IDs.
 * Cost multipliers are product policy (not token-metered).
 */

import { tierAtLeast, type TierSlug } from '@/lib/tier-rank';

export type GenerationProvider = 'deepseek' | 'google' | 'anthropic' | 'openai';

export type GenerationModelId =
  | 'deepseek-flash'
  | 'gemini-3-flash'
  | 'claude-haiku-4.5'
  | 'claude-sonnet-5'
  | 'gpt-5.6-terra'
  | 'gemini-3.1-pro'
  | 'claude-opus-5'
  | 'gpt-5.6-sol'
  | 'gpt-6-astra';

export type GenerationModel = {
  id: GenerationModelId;
  label: string;
  shortLabel: string;
  provider: GenerationProvider;
  /** Exact API model string sent to the provider */
  apiModelId: string;
  creditCost: number;
  /** Minimum tier slug required; null = available to all (incl. Sandbox/Basic) */
  minTier: TierSlug | null;
  blurb: string;
};

/** Models ≥ this credit cost require Pro Worker+ */
export const PREMIUM_MODEL_CREDIT_THRESHOLD = 20;

export const DEFAULT_GENERATION_MODEL_ID: GenerationModelId = 'deepseek-flash';

export const GENERATION_MODELS: GenerationModel[] = [
  {
    id: 'deepseek-flash',
    label: 'DeepSeek V4.1 Flash',
    shortLabel: 'DeepSeek Flash',
    provider: 'deepseek',
    apiModelId: 'deepseek-flash',
    creditCost: 1,
    minTier: null,
    blurb: 'Default — fast coding baseline',
  },
  {
    id: 'gemini-3-flash',
    label: 'Gemini 3 Flash',
    shortLabel: 'Gemini Flash',
    provider: 'google',
    apiModelId: 'gemini-3-flash-preview',
    creditCost: 3,
    minTier: null,
    blurb: 'Google speed tier',
  },
  {
    id: 'claude-haiku-4.5',
    label: 'Claude Haiku 4.5',
    shortLabel: 'Haiku 4.5',
    provider: 'anthropic',
    apiModelId: 'claude-haiku-4-5-20251001',
    creditCost: 4,
    minTier: null,
    blurb: 'Anthropic fast tier',
  },
  {
    id: 'claude-sonnet-5',
    label: 'Claude Sonnet 5',
    shortLabel: 'Sonnet 5',
    provider: 'anthropic',
    apiModelId: 'claude-sonnet-5',
    creditCost: 8,
    minTier: null,
    blurb: 'Strong balance of quality & speed',
  },
  {
    id: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    shortLabel: 'GPT Terra',
    provider: 'openai',
    apiModelId: 'gpt-5.6-terra',
    creditCost: 10,
    minTier: null,
    blurb: 'OpenAI balanced tier',
  },
  {
    id: 'gemini-3.1-pro',
    label: 'Gemini 3.1 Pro',
    shortLabel: 'Gemini Pro',
    provider: 'google',
    apiModelId: 'gemini-3.1-pro-preview',
    creditCost: 10,
    minTier: null,
    blurb: 'Google pro reasoning',
  },
  {
    id: 'claude-opus-5',
    label: 'Claude Opus 5',
    shortLabel: 'Opus 5',
    provider: 'anthropic',
    apiModelId: 'claude-opus-5',
    creditCost: 20,
    minTier: 'pro',
    blurb: 'Premium Anthropic — Pro Worker+',
  },
  {
    id: 'gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    shortLabel: 'GPT Sol',
    provider: 'openai',
    apiModelId: 'gpt-5.6-sol',
    creditCost: 25,
    minTier: 'pro',
    blurb: 'Premium OpenAI — Pro Worker+',
  },
  {
    id: 'gpt-6-astra',
    label: 'GPT-6 Astra',
    shortLabel: 'GPT Astra',
    provider: 'openai',
    apiModelId: 'gpt-6-astra',
    creditCost: 40,
    minTier: 'pro',
    blurb: 'Top OpenAI — Pro Worker+',
  },
];

const BY_ID = Object.fromEntries(
  GENERATION_MODELS.map((m) => [m.id, m])
) as Record<GenerationModelId, GenerationModel>;

export function getGenerationModel(
  id: string | null | undefined
): GenerationModel {
  if (id && id in BY_ID) return BY_ID[id as GenerationModelId];
  return BY_ID[DEFAULT_GENERATION_MODEL_ID];
}

export function isGenerationModelId(id: unknown): id is GenerationModelId {
  return typeof id === 'string' && id in BY_ID;
}

export function canSelectGenerationModel(
  model: GenerationModel,
  tier: string | null | undefined,
  bypass?: boolean
): boolean {
  if (bypass) return true;
  if (!model.minTier) return true;
  return tierAtLeast(tier, model.minTier);
}

export function generationModelLockedReason(model: GenerationModel): string {
  if (!model.minTier) return '';
  return 'Pro Worker and above';
}

/** Claude Sonnet 5 / Opus 5 reject non-default sampling params (400). */
export function anthropicAllowsSamplingParams(apiModelId: string): boolean {
  return !/^claude-(sonnet-5|opus-5)\b/.test(apiModelId);
}

/**
 * Newer OpenAI models (GPT-5.x Terra/Sol, GPT-6 Astra, o-series) reject custom
 * temperature — only the API default (1) is allowed. Omit the param entirely.
 */
export function openAIAllowsCustomTemperature(apiModelId: string): boolean {
  const id = apiModelId.toLowerCase();
  return !(
    id.startsWith('gpt-5') ||
    id.startsWith('gpt-6') ||
    id.startsWith('o1') ||
    id.startsWith('o3') ||
    id.startsWith('o4') ||
    id.includes('terra') ||
    id.includes('astra') ||
    /-sol\b/.test(id)
  );
}
