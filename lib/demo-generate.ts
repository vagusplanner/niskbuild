import 'server-only';

import { getGroqClient } from '@/lib/groq-client';

export type DemoBlueprint = {
  appName: string;
  features: string[];
  suggestedTemplates: string[];
  estimatedBuildSeconds: number;
};

const DEMO_SYSTEM_PROMPT = `You are NiskBuild's demo preview engine. Given an app idea, return ONLY valid JSON — no markdown.

Schema:
{
  "appName": "string (short product name)",
  "features": ["exactly 5 concise feature strings"],
  "suggestedTemplates": ["1-3 NiskBuild marketplace template names that fit, e.g. Portfolio Builder, Waitlist Landing Page, Ecommerce Dashboard"]
}

Rules:
- features must be exactly 5 items, each under 80 characters
- suggestedTemplates: 1-3 real-sounding template names relevant to the prompt
- Be specific to the user's request (salon booking, restaurant, SaaS, game, etc.)`;

function normalizeDemoBlueprint(raw: unknown): DemoBlueprint | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const appName = typeof data.appName === 'string' ? data.appName.trim() : '';
  const features = Array.isArray(data.features)
    ? data.features
        .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
        .map((f) => f.trim())
    : [];
  const suggestedTemplates = Array.isArray(data.suggestedTemplates)
    ? data.suggestedTemplates
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim())
    : [];

  if (!appName || features.length === 0) return null;

  return {
    appName,
    features: features.slice(0, 5),
    suggestedTemplates: suggestedTemplates.slice(0, 3),
    estimatedBuildSeconds: 47,
  };
}

function fallbackDemoBlueprint(prompt: string): DemoBlueprint {
  const lower = prompt.toLowerCase();
  if (lower.includes('game') || lower.includes('platformer')) {
    return {
      appName: 'Pixel Runner Studio',
      features: [
        'Phaser.js 2D platformer canvas with smooth physics',
        'Player movement, jump, and collision detection',
        'Enemy patrol routes and collectible coins',
        'Level select screen with 3 starter stages',
        'Mobile-friendly touch controls and fullscreen mode',
      ],
      suggestedTemplates: ['Game Templates', 'Portfolio Builder'],
      estimatedBuildSeconds: 47,
    };
  }
  if (lower.includes('restaurant') || lower.includes('menu')) {
    return {
      appName: 'Bistro Online',
      features: [
        'Hero section with hours, location, and reservations CTA',
        'Interactive menu with categories and dietary tags',
        'Online table booking form with date/time picker',
        'Photo gallery and chef story section',
        'Mobile-responsive layout with Google Maps embed',
      ],
      suggestedTemplates: ['Waitlist Landing Page', 'Portfolio Builder'],
      estimatedBuildSeconds: 47,
    };
  }
  if (lower.includes('task') || lower.includes('saas')) {
    return {
      appName: 'FlowTask Pro',
      features: [
        'Kanban board with drag-and-drop task columns',
        'Project workspaces and team member invites',
        'Due dates, priorities, and activity timeline',
        'Dashboard with completion metrics',
        'Dark-mode UI with Tailwind CSS styling',
      ],
      suggestedTemplates: ['Ecommerce Dashboard', 'CRM Starter'],
      estimatedBuildSeconds: 47,
    };
  }
  return {
    appName: 'SalonBook Pro',
    features: [
      'Staff calendar with appointment slots and availability',
      'Client booking flow with service selection',
      'Stripe checkout for deposits and service payments',
      'SMS/email confirmation reminders',
      'Admin dashboard for stylists and revenue overview',
    ],
    suggestedTemplates: ['Booking System', 'Ecommerce Dashboard', 'Waitlist Landing Page'],
    estimatedBuildSeconds: 47,
  };
}

export async function generateDemoBlueprint(prompt: string): Promise<{
  success: boolean;
  blueprint?: DemoBlueprint;
  error?: string;
}> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { success: false, error: 'Prompt is required' };
  }
  if (trimmed.length > 500) {
    return { success: false, error: 'Prompt must be 500 characters or fewer' };
  }

  const groq = getGroqClient();
  if (!groq) {
    return { success: true, blueprint: fallbackDemoBlueprint(trimmed) };
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: DEMO_SYSTEM_PROMPT },
        { role: 'user', content: trimmed },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { success: true, blueprint: fallbackDemoBlueprint(trimmed) };
    }

    const parsed = JSON.parse(content) as unknown;
    const blueprint = normalizeDemoBlueprint(parsed);
    if (!blueprint) {
      return { success: true, blueprint: fallbackDemoBlueprint(trimmed) };
    }

    while (blueprint.features.length < 5) {
      blueprint.features.push('Polished UI with NiskBuild design system');
    }

    return { success: true, blueprint };
  } catch (error) {
    console.error('Demo blueprint error:', error);
    return { success: true, blueprint: fallbackDemoBlueprint(trimmed) };
  }
}
