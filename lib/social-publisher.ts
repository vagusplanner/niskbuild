import type { ComponentBlueprint } from '@/lib/blueprint-schema';

export type SocialPostKey =
  | 'instagram'
  | 'linkedin'
  | 'twitter'
  | 'facebook'
  | 'google_business'
  | 'tiktok_script'
  | 'whatsapp';

export type SocialPosts = Record<SocialPostKey, string>;

export const SOCIAL_POST_LABELS: Record<SocialPostKey, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X / Twitter',
  facebook: 'Facebook',
  google_business: 'Google Business',
  tiktok_script: 'TikTok script',
  whatsapp: 'WhatsApp',
};

export const SOCIAL_SYSTEM_PROMPT = `Generate social media posts announcing this app. Return ONLY valid JSON with keys:
instagram (max 2200 chars, casual tone, hashtags, emoji),
linkedin (max 1300 chars, professional, business value),
twitter (max 280 chars, punchy hook),
facebook (max 600 chars, friendly),
google_business (max 300 chars, local SEO),
tiktok_script (60 second narration script),
whatsapp (max 139 chars).
Use the app name, category, and features from the blueprint. No markdown fences.`;

export function blueprintContextForSocial(blueprint: ComponentBlueprint | null, prompt: string): string {
  if (!blueprint) {
    return JSON.stringify({ prompt, name: prompt.slice(0, 80) });
  }
  return JSON.stringify({
    name: blueprint.meta?.title,
    category: blueprint.meta?.type,
    description: blueprint.meta?.description,
    integrations: blueprint.integrations,
    features: summarizeBlueprintFeatures(blueprint),
    prompt,
  }).slice(0, 4000);
}

function summarizeBlueprintFeatures(blueprint: ComponentBlueprint): string[] {
  const features: string[] = [];
  const walk = (node: ComponentBlueprint['canvasTree']['root'] | undefined) => {
    if (!node) return;
    features.push(node.component);
    node.children?.forEach(walk);
  };
  walk(blueprint.canvasTree?.root);
  return [...new Set(features)].slice(0, 12);
}

export function parseSocialPosts(raw: string): SocialPosts | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<SocialPosts>;
    const keys: SocialPostKey[] = [
      'instagram',
      'linkedin',
      'twitter',
      'facebook',
      'google_business',
      'tiktok_script',
      'whatsapp',
    ];
    const out = {} as SocialPosts;
    for (const key of keys) {
      const val = parsed[key];
      if (typeof val !== 'string' || !val.trim()) return null;
      out[key] = val.trim();
    }
    return out;
  } catch {
    return null;
  }
}
