/**
 * Create a temporary student for SPA browser login tests.
 * Prints JSON credentials; does NOT delete (caller cleans up).
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const originalLoad = (Module as unknown as { _load: Function })._load;
(Module as unknown as { _load: Function })._load = function (
  request: string,
  parent: unknown,
  isMain: boolean
) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, parent, isMain);
};

for (const line of readFileSync(resolve('.env.local'), 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq <= 0) continue;
  const k = t.slice(0, eq).trim();
  const v = t.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

async function main() {
  const { createAdminClient } = await import('../lib/supabase/admin');
  const admin = createAdminClient();
  const suffix = randomBytes(3).toString('hex');
  const email = `shift.spa.${suffix}@students.niskbuild.com`;
  const password = `SpaTest-${suffix}!aA1`;
  const fullName = `Spa Browser ${suffix}`;

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(error?.message || 'create failed');

  const { data: student, error: sErr } = await admin
    .schema('firstparty')
    .from('shift_students')
    .insert({
      user_id: created.user.id,
      full_name: fullName,
      curriculum: 'uk',
      year_group: 'Year 9',
      key_stage: 'Key Stage 3',
      age_range: '13',
      favourite_subjects: ['Biology', 'History'],
      account_type: 'self',
      is_active: true,
      parent_consent_given: false,
      study_language: 'en',
    })
    .select('id')
    .single();
  if (sErr) throw new Error(sErr.message);

  console.log(
    JSON.stringify({
      email,
      password,
      fullName,
      userId: created.user.id,
      studentId: student.id,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
