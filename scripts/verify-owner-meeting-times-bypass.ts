/**
 * Verify platform-owner bypass for findOptimalMeetingTimes usage gating.
 * Simulates ALS loss (no prior initProductGatingContext) then calls the same
 * gateFeature → requireFeatureUsage path used by Find Optimal Times.
 *
 * Run: npx tsx scripts/verify-owner-meeting-times-bypass.ts
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const originalLoad = (Module as unknown as { _load: Function })._load;
(Module as unknown as { _load: Function })._load = function (
  request: string,
  parent: unknown,
  isMain: boolean
) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, parent, isMain);
};

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const OWNER_EMAIL = 'sofiane.kemih@gmail.com';

async function main() {
  const { createAdminClient } = await import('../lib/supabase/admin');
  const admin = createAdminClient();

  // Resolve owner user id from platform_owners (preferred) or auth.users email.
  let userId: string | null = null;
  let source = '';

  const { data: owners } = await admin
    .schema('firstparty')
    .from('platform_owners')
    .select('user_id')
    .limit(20);

  if (owners?.length) {
    // Prefer sofiane if we can match via profiles/auth email
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const sofiane = users?.users?.find(
      (u) => (u.email || '').toLowerCase() === OWNER_EMAIL
    );
    if (sofiane && owners.some((o) => o.user_id === sofiane.id)) {
      userId = sofiane.id;
      source = 'platform_owners+email';
    } else if (sofiane) {
      userId = sofiane.id;
      source = 'auth.users email (NOT in platform_owners — will fail bypass)';
    } else {
      userId = owners[0].user_id as string;
      source = 'platform_owners[0]';
    }
  }

  if (!userId) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const sofiane = users?.users?.find(
      (u) => (u.email || '').toLowerCase() === OWNER_EMAIL
    );
    if (sofiane) {
      userId = sofiane.id;
      source = 'auth.users only (missing platform_owners row)';
    }
  }

  if (!userId) {
    throw new Error(`Could not resolve user id for ${OWNER_EMAIL}`);
  }

  console.log(`Owner userId=${userId} source=${source}`);

  const { isPlatformOwner } = await import('../lib/platform-owner-auth');
  const {
    isProductGatingBypassActive,
    resolveProductGatingBypass,
  } = await import('../lib/platform-owner-bypass');
  const { requireFeatureUsage } = await import('../lib/vp-usage-meter');
  const { findOptimalMeetingTimes, gateFeature } = await import(
    '../lib/vp-functions/handlers/calendar-ai'
  );

  const ownerLookup = await isPlatformOwner(userId);
  console.log(`isPlatformOwner(userId)=${ownerLookup}`);
  console.log(`ALS before resolve: isProductGatingBypassActive()=${isProductGatingBypassActive()}`);

  // Simulate ALS loss: do NOT call initProductGatingContext first.
  const gate = await requireFeatureUsage(admin, {
    userId,
    email: OWNER_EMAIL,
    feature: 'ai_requests',
  });
  console.log('requireFeatureUsage (no prior ALS):', {
    ok: gate.ok,
    plan: gate.plan,
    unlimited: gate.usage.unlimited,
    error: gate.ok ? undefined : gate.error,
  });

  if (!gate.ok) {
    throw new Error(`FAIL: owner still quota-blocked: ${gate.error}`);
  }
  if (!gate.usage.unlimited || gate.plan !== 'enterprise_islamic') {
    throw new Error(
      `FAIL: expected unlimited enterprise_islamic, got plan=${gate.plan} unlimited=${gate.usage.unlimited}`
    );
  }

  const bypassAfter = await resolveProductGatingBypass(userId);
  console.log(`resolveProductGatingBypass=${bypassAfter} ALS=${isProductGatingBypassActive()}`);

  const featureGate = await gateFeature(
    { id: userId, email: OWNER_EMAIL },
    'ai_requests'
  );
  if (!featureGate.ok) {
    throw new Error(`FAIL: gateFeature denied: ${featureGate.result.error}`);
  }
  console.log('gateFeature ok, plan=', featureGate.plan);

  // Full handler (may call AI providers — still must not return Free usage limit)
  const result = await findOptimalMeetingTimes({
    request: {} as import('next/server').NextRequest,
    user: { id: userId, email: OWNER_EMAIL } as import('@supabase/supabase-js').User,
    payload: { duration: 30, dateRange: 3, participants: [] },
  });

  if (!result.ok && /Free usage limit reached/i.test(result.error || '')) {
    throw new Error(`FAIL: findOptimalMeetingTimes hit usage limit: ${result.error}`);
  }

  console.log('findOptimalMeetingTimes:', {
    ok: result.ok,
    error: result.ok ? undefined : result.error,
    status: result.ok ? undefined : result.status,
    slots: result.ok
      ? ((result.data as { optimal_slots?: unknown[] })?.optimal_slots || []).length
      : undefined,
  });

  if (!result.ok && result.status === 402) {
    throw new Error(`FAIL: 402 from findOptimalMeetingTimes: ${result.error}`);
  }

  console.log('PASS: platform owner bypass respected for Find Optimal Times path');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
