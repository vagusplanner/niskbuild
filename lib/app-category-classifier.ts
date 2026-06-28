import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import {
  APP_CATEGORY_SLUGS,
  normalizeCategorySlug,
  type AppCategorySlug,
} from '@/lib/app-categories';

const KEYWORD_RULES: { slug: AppCategorySlug; keywords: string[] }[] = [
  { slug: 'medical', keywords: ['medical', 'health', 'patient', 'doctor', 'clinic', 'hospital', 'telemedicine'] },
  { slug: 'restaurant', keywords: ['restaurant', 'food', 'menu', 'delivery', 'cafe', 'dining'] },
  { slug: 'finance', keywords: ['finance', 'bank', 'payment', 'invoice', 'wallet', 'lending', 'fintech', 'budget'] },
  { slug: 'ecommerce', keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'cart', 'checkout', 'product catalog'] },
  { slug: 'education', keywords: ['education', 'course', 'learning', 'lms', 'student', 'quiz', 'tutorial'] },
  { slug: 'fitness', keywords: ['fitness', 'workout', 'gym', 'exercise', 'training', 'yoga'] },
  { slug: 'social', keywords: ['social', 'feed', 'chat', 'community', 'messaging', 'forum'] },
  { slug: 'gaming', keywords: ['game', 'gaming', 'player', 'phaser', 'arcade', 'leaderboard'] },
  { slug: 'productivity', keywords: ['productivity', 'task', 'todo', 'kanban', 'workflow', 'dashboard', 'saas'] },
  { slug: 'business', keywords: ['business', 'crm', 'sales', 'agency', 'consulting', 'b2b', 'startup'] },
];

function classifyByKeywords(prompt: string): AppCategorySlug {
  const text = prompt.toLowerCase();
  let best: { slug: AppCategorySlug; score: number } = { slug: 'other', score: 0 };

  for (const rule of KEYWORD_RULES) {
    const score = rule.keywords.reduce((sum, kw) => sum + (text.includes(kw) ? 1 : 0), 0);
    if (score > best.score) best = { slug: rule.slug, score };
  }

  return best.score > 0 ? best.slug : 'other';
}

export async function classifyAppCategory(prompt: string): Promise<AppCategorySlug> {
  const trimmed = prompt.trim();
  if (!trimmed) return 'other';

  const groq = getGroqClient();
  if (!groq) return classifyByKeywords(trimmed);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You classify app builder projects into exactly one category slug. Valid slugs: ${APP_CATEGORY_SLUGS.join(', ')}. Reply with ONLY the slug, nothing else.`,
        },
        {
          role: 'user',
          content: `Classify this project description:\n\n${trimmed.slice(0, 2000)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 16,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    return normalizeCategorySlug(raw);
  } catch (error) {
    console.error('Category classification error:', error);
    return classifyByKeywords(trimmed);
  }
}
