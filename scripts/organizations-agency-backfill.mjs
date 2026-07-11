#!/usr/bin/env node
/**
 * Dry-run (default) or apply solo-org backfill for active Agency+ profiles.
 *
 * Usage:
 *   node --env-file=.env.local scripts/organizations-agency-backfill.mjs
 *   node --env-file=.env.local scripts/organizations-agency-backfill.mjs --apply
 *
 * Prefer the SQL file in supabase/ for production applies when possible;
 * this script is for local/ops convenience and prints the dry-run count first.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const k = m[1].trim();
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // rely on process env
  }
}

loadEnvLocal();

const APPLY = process.argv.includes('--apply');
const AGENCY_PLUS = ['agency', 'scale', 'white_label', 'team_enterprise', 'sovereign'];
const ACTIVE = ['active', 'past_due'];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function tablesReady() {
  const { error } = await admin.from('organizations').select('id').limit(1);
  if (error) {
    console.error(
      'organizations table not available. Apply supabase/organizations-phase1-migration.sql first.'
    );
    console.error(error.message);
    return false;
  }
  return true;
}

async function listEligible() {
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, subscription_tier, subscription_status')
    .in('subscription_tier', AGENCY_PLUS)
    .in('subscription_status', ACTIVE);

  if (error) throw new Error(error.message);

  const { data: orgs, error: orgErr } = await admin
    .from('organizations')
    .select('billing_owner_id');

  if (orgErr) throw new Error(orgErr.message);

  const alreadyOwner = new Set((orgs ?? []).map((o) => o.billing_owner_id));
  return (profiles ?? []).filter((p) => !alreadyOwner.has(p.id));
}

function orgName(email) {
  const local = (email || '').split('@')[0]?.trim();
  return `${local || 'Personal'} workspace`;
}

async function main() {
  if (!(await tablesReady())) process.exit(1);

  const eligible = await listEligible();
  console.log('=== DRY RUN ===');
  console.log(`Would create organizations: ${eligible.length}`);
  for (const p of eligible.slice(0, 50)) {
    console.log(`  - ${p.email || p.id} (${p.subscription_tier}/${p.subscription_status})`);
  }
  if (eligible.length > 50) console.log(`  … and ${eligible.length - 50} more`);

  if (!APPLY) {
    console.log('\nRe-run with --apply to insert (after reviewing the count).');
    return;
  }

  console.log('\n=== APPLY ===');
  let created = 0;
  for (const p of eligible) {
    const { data: org, error: insErr } = await admin
      .from('organizations')
      .insert({ name: orgName(p.email), billing_owner_id: p.id })
      .select('id')
      .single();
    if (insErr) {
      console.error(`Failed org for ${p.email || p.id}:`, insErr.message);
      continue;
    }
    const { error: memErr } = await admin.from('organization_members').insert({
      org_id: org.id,
      user_id: p.id,
      role: 'owner',
    });
    if (memErr) {
      console.error(`Failed member for ${p.email || p.id}:`, memErr.message);
      await admin.from('organizations').delete().eq('id', org.id);
      continue;
    }
    created += 1;
  }
  console.log(`Created ${created} organization(s) with owner membership.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
