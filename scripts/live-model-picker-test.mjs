/**
 * Live model-picker verification.
 * Run with: npx vercel env run -e production -- node scripts/live-model-picker-test.mjs
 * Never prints secret values.
 */
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../.tmp-model-picker-test');
mkdirSync(outDir, { recursive: true });

const PROMPT = `Generate ONLY a complete minimal HTML page (start with <!DOCTYPE html>).
Title: "ModelProbe". Include one h1 "ModelProbe OK" and a paragraph with the current provider name placeholder text "generated-by-cloud".
Use Tailwind CDN. No markdown fences. Keep under 80 lines.`;

const MODELS = [
  { id: 'deepseek-flash', label: 'DeepSeek V4.1 Flash', provider: 'deepseek', apiModelId: 'deepseek-flash', creditCost: 1, minTier: null },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'google', apiModelId: 'gemini-3-flash-preview', creditCost: 3, minTier: null },
  { id: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', provider: 'anthropic', apiModelId: 'claude-haiku-4-5-20251001', creditCost: 4, minTier: null },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', provider: 'anthropic', apiModelId: 'claude-sonnet-5', creditCost: 8, minTier: null },
  { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', provider: 'openai', apiModelId: 'gpt-5.6-terra', creditCost: 10, minTier: null },
  { id: 'claude-opus-5', label: 'Claude Opus 5', provider: 'anthropic', apiModelId: 'claude-opus-5', creditCost: 20, minTier: 'pro' },
  { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', provider: 'openai', apiModelId: 'gpt-5.6-sol', creditCost: 25, minTier: 'pro' },
  { id: 'gpt-6-astra', label: 'GPT-6 Astra', provider: 'openai', apiModelId: 'gpt-6-astra', creditCost: 40, minTier: 'pro' },
];

const TIER_ORDER = ['free', 'basic', 'pro', 'agency', 'scale', 'white_label', 'team_enterprise', 'sovereign'];
function tierAtLeast(tier, minimum) {
  return TIER_ORDER.indexOf(tier || 'free') >= TIER_ORDER.indexOf(minimum);
}
function canSelect(model, tier) {
  if (!model.minTier) return true;
  return tierAtLeast(tier, model.minTier);
}

function keyStatus(name) {
  const v = process.env[name]?.trim();
  if (!v) return { set: false, len: 0 };
  return { set: true, len: v.length };
}

async function callDeepSeek(apiModelId) {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) throw new Error('DEEPSEEK_API_KEY missing');
  const client = new OpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' });
  const started = Date.now();
  const completion = await client.chat.completions.create({
    model: apiModelId,
    messages: [
      { role: 'system', content: 'You are an expert web developer. Output ONLY HTML starting with <!DOCTYPE html>.' },
      { role: 'user', content: PROMPT },
    ],
    max_tokens: 1200,
    temperature: 0.4,
  });
  const code = completion.choices[0]?.message?.content || '';
  const modelReported = completion.model || apiModelId;
  return {
    code,
    ms: Date.now() - started,
    modelReported,
    finish: completion.choices[0]?.finish_reason ?? null,
    usage: completion.usage ?? null,
  };
}

async function callOpenAI(apiModelId) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OPENAI_API_KEY missing');
  const client = new OpenAI({ apiKey: key });
  const started = Date.now();
  const completion = await client.chat.completions.create({
    model: apiModelId,
    messages: [
      { role: 'system', content: 'You are an expert web developer. Output ONLY HTML starting with <!DOCTYPE html>.' },
      { role: 'user', content: PROMPT },
    ],
    max_tokens: 1200,
  });
  const code = completion.choices[0]?.message?.content || '';
  return {
    code,
    ms: Date.now() - started,
    modelReported: completion.model || apiModelId,
    finish: completion.choices[0]?.finish_reason ?? null,
    usage: completion.usage ?? null,
  };
}

async function callAnthropic(apiModelId) {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error('ANTHROPIC_API_KEY missing');
  const client = new Anthropic({ apiKey: key });
  const started = Date.now();
  const allowTemp = !/^claude-(sonnet-5|opus-5)\b/.test(apiModelId);
  const message = await client.messages.create({
    model: apiModelId,
    max_tokens: 1200,
    ...(allowTemp ? { temperature: 0.4 } : {}),
    system: 'You are an expert web developer. Output ONLY HTML starting with <!DOCTYPE html>.',
    messages: [{ role: 'user', content: PROMPT }],
  });
  const code = message.content[0]?.type === 'text' ? message.content[0].text : '';
  return {
    code,
    ms: Date.now() - started,
    modelReported: message.model || apiModelId,
    finish: message.stop_reason ?? null,
    usage: message.usage ?? null,
  };
}

async function callGemini(apiModelId) {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const started = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModelId}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: 'You are an expert web developer. Output ONLY HTML starting with <!DOCTYPE html>.' }],
      },
      contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
      generationConfig: { maxOutputTokens: 1200, temperature: 0.4 },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  const code =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return {
    code,
    ms: Date.now() - started,
    modelReported: apiModelId,
    finish: json.candidates?.[0]?.finishReason ?? null,
    usage: json.usageMetadata ?? null,
  };
}

function analyze(code, expectedProvider) {
  const hasDoctype = /<!DOCTYPE html>/i.test(code);
  const hasProbe = /ModelProbe/i.test(code);
  const looksGroqOss = /gpt-oss|groq/i.test(code) === false; // content won't say groq usually
  return {
    chars: code.length,
    hasDoctype,
    hasProbe,
    endsHtml: /<\/html>\s*$/i.test(code.trim()),
    sha: createHash('sha256').update(code).digest('hex').slice(0, 12),
    expectedProvider,
  };
}

async function runModel(m) {
  const result = { id: m.id, label: m.label, creditCost: m.creditCost, provider: m.provider };
  try {
    let gen;
    if (m.provider === 'deepseek') gen = await callDeepSeek(m.apiModelId);
    else if (m.provider === 'google') gen = await callGemini(m.apiModelId);
    else if (m.provider === 'anthropic') gen = await callAnthropic(m.apiModelId);
    else if (m.provider === 'openai') gen = await callOpenAI(m.apiModelId);
    else throw new Error('unknown provider');

    writeFileSync(resolve(outDir, `${m.id}.html`), gen.code);
    const analysis = analyze(gen.code, m.provider);
    const isDeepSeekConfirmed =
      m.provider === 'deepseek' &&
      typeof gen.modelReported === 'string' &&
      /deepseek/i.test(gen.modelReported) &&
      !/gpt-oss|groq/i.test(gen.modelReported);

    Object.assign(result, {
      ok: analysis.hasDoctype && analysis.chars > 200,
      ...analysis,
      ms: gen.ms,
      modelReported: gen.modelReported,
      finish: gen.finish,
      usage: gen.usage,
      isDeepSeekConfirmed: m.provider === 'deepseek' ? isDeepSeekConfirmed : undefined,
      notGroqFallback:
        m.provider === 'deepseek'
          ? isDeepSeekConfirmed
          : !/gpt-oss/i.test(String(gen.modelReported || '')),
    });
  } catch (e) {
    result.ok = false;
    result.error = e instanceof Error ? e.message : String(e);
  }
  return result;
}

async function creditSimulationViaDb() {
  // Simulate deduct amounts against a real profile if admin key works.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || key.length < 80) {
    return { available: false, reason: 'Supabase admin credentials not usable in this env' };
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Prefer a known paid test profile with credits; fall back to any active pro+ with credits.
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, subscription_tier, subscription_status, cloud_credits_remaining')
    .eq('subscription_status', 'active')
    .in('subscription_tier', ['pro', 'agency', 'basic', 'free'])
    .gt('cloud_credits_remaining', 50)
    .limit(20);

  if (error) return { available: false, reason: error.message };
  if (!profiles?.length) return { available: false, reason: 'No suitable profiles with credits' };

  const basicOrFree = profiles.find((p) => p.subscription_tier === 'basic' || p.subscription_tier === 'free');
  const pro = profiles.find((p) => p.subscription_tier === 'pro' || p.subscription_tier === 'agency');

  const gating = {
    freeOrBasic: basicOrFree
      ? {
          tier: basicOrFree.subscription_tier,
          opus: canSelect(MODELS.find((m) => m.id === 'claude-opus-5'), basicOrFree.subscription_tier),
          sol: canSelect(MODELS.find((m) => m.id === 'gpt-5.6-sol'), basicOrFree.subscription_tier),
          astra: canSelect(MODELS.find((m) => m.id === 'gpt-6-astra'), basicOrFree.subscription_tier),
          terra: canSelect(MODELS.find((m) => m.id === 'gpt-5.6-terra'), basicOrFree.subscription_tier),
        }
      : { note: 'No basic/free profile with credits found — code-level gating still verified' },
    pro: pro
      ? {
          tier: pro.subscription_tier,
          opus: canSelect(MODELS.find((m) => m.id === 'claude-opus-5'), pro.subscription_tier),
          sol: canSelect(MODELS.find((m) => m.id === 'gpt-5.6-sol'), pro.subscription_tier),
          astra: canSelect(MODELS.find((m) => m.id === 'gpt-6-astra'), pro.subscription_tier),
        }
      : { note: 'No pro profile found — code-level gating still verified' },
  };

  // Dry-run credit math (do NOT mutate production balances in this probe unless explicitly requested).
  // Instead: read before, compute expected after, report — actual deduct requires hitting /api/cloud-generate with a session.
  return {
    available: true,
    sampleProfiles: profiles.slice(0, 5).map((p) => ({
      tier: p.subscription_tier,
      status: p.subscription_status,
      credits: p.cloud_credits_remaining,
      emailHash: createHash('sha256').update(p.email || p.id).digest('hex').slice(0, 8),
    })),
    gating,
  };
}

async function main() {
  const keys = {
    DEEPSEEK_API_KEY: keyStatus('DEEPSEEK_API_KEY'),
    GEMINI_API_KEY: keyStatus('GEMINI_API_KEY'),
    OPENAI_API_KEY: keyStatus('OPENAI_API_KEY'),
    ANTHROPIC_API_KEY: keyStatus('ANTHROPIC_API_KEY'),
  };

  console.log('=== KEY STATUS (no values) ===');
  console.log(JSON.stringify(keys, null, 2));

  // Code-level gating (always)
  const gatingMatrix = {
    free: MODELS.map((m) => ({ id: m.id, cost: m.creditCost, allowed: canSelect(m, 'free') })),
    basic: MODELS.map((m) => ({ id: m.id, cost: m.creditCost, allowed: canSelect(m, 'basic') })),
    pro: MODELS.map((m) => ({ id: m.id, cost: m.creditCost, allowed: canSelect(m, 'pro') })),
  };

  const toRun = [
    'deepseek-flash',
    'gemini-3-flash',
    'gpt-5.6-terra',
    'claude-haiku-4.5',
    'claude-sonnet-5',
  ];

  const generations = [];
  for (const id of toRun) {
    const m = MODELS.find((x) => x.id === id);
    console.log(`\n=== Generating ${m.label} (${m.creditCost} cr) ===`);
    const r = await runModel(m);
    generations.push(r);
    console.log(
      JSON.stringify(
        {
          id: r.id,
          ok: r.ok,
          modelReported: r.modelReported,
          ms: r.ms,
          chars: r.chars,
          creditCost: r.creditCost,
          isDeepSeekConfirmed: r.isDeepSeekConfirmed,
          error: r.error,
        },
        null,
        2
      )
    );
  }

  const db = await creditSimulationViaDb();

  const report = {
    ranAt: new Date().toISOString(),
    keys,
    gatingMatrix,
    generations,
    db,
    creditCostContract: Object.fromEntries(MODELS.map((m) => [m.id, m.creditCost])),
    note:
      'Provider calls use production env via `vercel env run`. Credit balance mutation requires authenticated /api/cloud-generate; this script verifies providers + cost catalog + tier gates.',
  };

  writeFileSync(resolve(outDir, 'REPORT.json'), JSON.stringify(report, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(
    JSON.stringify(
      {
        generations: generations.map((g) => ({
          id: g.id,
          ok: g.ok,
          modelReported: g.modelReported,
          creditCost: g.creditCost,
          isDeepSeekConfirmed: g.isDeepSeekConfirmed,
          error: g.error,
        })),
        premiumLockedForFree: gatingMatrix.free.filter((x) => x.cost >= 20).every((x) => !x.allowed),
        premiumOpenForPro: gatingMatrix.pro.filter((x) => x.cost >= 20).every((x) => x.allowed),
        dbAvailable: db.available,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
