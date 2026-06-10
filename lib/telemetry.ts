import { randomBytes } from 'crypto';
import type { DemographicTier } from '@/lib/demographic-tiers';

export interface TelemetryRecord {
  telemetry_id: string;
  timestamp_hourly: string;
  user_demographic_tier: DemographicTier;
  app_vertical: string;
  core_stack: string[];
  ai_model_used: string;
  generation_success: boolean;
}

export interface CompilationEvent {
  /** Used in-memory only for classification — never persisted */
  prompt?: string;
  /** Used in-memory only for stack detection — never persisted */
  generatedCode?: string;
  aiModelUsed: string;
  generationSuccess: boolean;
  demographicTier?: DemographicTier;
  appVertical?: string;
  frameworkTags?: string[];
}

const VERTICAL_RULES: { vertical: string; keywords: string[] }[] = [
  { vertical: 'FinTech / Micro-Lending', keywords: ['fintech', 'lending', 'loan', 'banking', 'payment', 'invoice', 'wallet', 'crypto'] },
  { vertical: 'E-commerce / Retail', keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'cart', 'checkout', 'product'] },
  { vertical: 'Healthcare / Telemedicine', keywords: ['health', 'medical', 'patient', 'doctor', 'telemedicine', 'appointment', 'clinic'] },
  { vertical: 'Education / LMS', keywords: ['learning', 'course', 'lms', 'quiz', 'student', 'education', 'tutorial'] },
  { vertical: 'CRM / Sales', keywords: ['crm', 'pipeline', 'deal', 'contact', 'sales', 'lead'] },
  { vertical: 'Real Estate', keywords: ['real estate', 'property', 'rental', 'mortgage', 'listing', 'agent'] },
  { vertical: 'Food / Delivery', keywords: ['restaurant', 'food', 'delivery', 'menu', 'order'] },
  { vertical: 'Social / Media', keywords: ['social', 'twitter', 'instagram', 'feed', 'post', 'engagement'] },
  { vertical: 'Productivity / SaaS', keywords: ['dashboard', 'saas', 'task', 'kanban', 'project', 'workflow'] },
  { vertical: 'HR / Recruitment', keywords: ['recruit', 'hiring', 'job', 'resume', 'candidate', 'interview'] },
  { vertical: 'Events / Ticketing', keywords: ['event', 'ticket', 'attendee', 'conference', 'booking'] },
  { vertical: 'Portfolio / Creative', keywords: ['portfolio', 'gallery', 'photographer', 'creative', 'showcase'] },
  { vertical: 'AI / Automation', keywords: ['ai agent', 'chatbot', 'automation', 'llm', 'copilot'] },
  { vertical: 'Gaming / 3D', keywords: ['game', '3d', 'unity', 'phaser', 'player'] },
  { vertical: 'Analytics / BI', keywords: ['analytics', 'chart', 'metrics', 'kpi', 'report', 'data viz'] },
];

const STACK_RULES: { tag: string; patterns: RegExp[] }[] = [
  { tag: 'Next.js', patterns: [/next\.js/i, /next\/app/i, /from ['"]next/i] },
  { tag: 'React', patterns: [/react/i, /jsx/i, /useState/i] },
  { tag: 'Vue', patterns: [/vue/i, /v-model/i] },
  { tag: 'Vite', patterns: [/vite/i] },
  { tag: 'TypeScript', patterns: [/typescript/i, /\.tsx?\b/, /: string\b/] },
  { tag: 'TailwindCSS', patterns: [/tailwind/i, /className=/i] },
  { tag: 'Supabase', patterns: [/supabase/i] },
  { tag: 'Python', patterns: [/python/i, /def \w+\(/] },
  { tag: 'Chart.js', patterns: [/chart\.js/i, /new Chart/i] },
  { tag: 'Three.js', patterns: [/three\.js/i, /THREE\./] },
  { tag: 'HTML/CSS/JS', patterns: [/<!DOCTYPE html>/i, /<html/i] },
];

export function roundToNearestHour(date = new Date()): string {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export function generateTelemetryId(): string {
  return `tele_${randomBytes(4).toString('hex')}`;
}

export function classifyAppVertical(prompt: string): string {
  const text = prompt.toLowerCase();
  let best = { vertical: 'General / Custom App', score: 0 };

  for (const rule of VERTICAL_RULES) {
    const score = rule.keywords.reduce(
      (sum, kw) => sum + (text.includes(kw) ? 1 : 0),
      0
    );
    if (score > best.score) {
      best = { vertical: rule.vertical, score };
    }
  }

  return best.vertical;
}

export function detectFrameworkTags(prompt: string, code?: string): string[] {
  const corpus = `${prompt}\n${code || ''}`;
  const tags = STACK_RULES.filter((rule) =>
    rule.patterns.some((p) => p.test(corpus))
  ).map((r) => r.tag);

  return tags.length > 0 ? tags : ['HTML/CSS/JS'];
}

export function normalizeAiModel(provider: string, modelHint?: string): string {
  if (modelHint) return modelHint;
  const map: Record<string, string> = {
    groq: 'llama-3.3-70b-versatile',
    anthropic: 'claude-3-sonnet',
    openai: 'gpt-4-turbo',
    together: 'llama-3.3-70b-instruct',
    local: 'qwen2.5-coder-7b',
    'user-keys': 'user-provided-model',
  };
  return map[provider] || provider;
}

/** Strip all PII-bearing fields from an inbound payload */
export function stripPersonalAttributes<T extends Record<string, unknown>>(payload: T) {
  const forbidden = [
    'userId',
    'user_id',
    'email',
    'name',
    'ip',
    'ipAddress',
    'latitude',
    'longitude',
    'location',
    'sessionId',
    'session_id',
    'prompt',
    'generatedCode',
    'generated_code',
    'code',
  ];

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!forbidden.includes(key)) {
      clean[key] = value;
    }
  }
  return clean;
}

export function buildTelemetryRecord(event: CompilationEvent): TelemetryRecord {
  const prompt = event.prompt || '';
  const code = event.generatedCode || '';

  return {
    telemetry_id: generateTelemetryId(),
    timestamp_hourly: roundToNearestHour(),
    user_demographic_tier: event.demographicTier || 'unspecified',
    app_vertical: event.appVertical || classifyAppVertical(prompt),
    core_stack: event.frameworkTags || detectFrameworkTags(prompt, code),
    ai_model_used: normalizeAiModel(event.aiModelUsed),
    generation_success: event.generationSuccess,
  };
}
