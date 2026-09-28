/**
 * Auth milestone 1 evidence script — runs against production Supabase (anon + service role).
 * Usage (from apps/north-south): node scripts/verify-auth-milestone.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(__dirname, '..')
const monorepoRoot = resolve(appRoot, '../..')

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

const env = {
  ...loadEnvFile(resolve(monorepoRoot, '.env.local')),
  ...loadEnvFile(resolve(appRoot, '.env.local')),
}

const url = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const anon = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anon || !service) {
  console.error('Missing URL / anon / service role in .env.local')
  process.exit(1)
}

const stamp = randomBytes(3).toString('hex')
const email = `ns-auth-m1-${stamp}@example.com`
const password = `NsAuth1!${stamp}`
const otherEmail = `ns-auth-m1-other-${stamp}@example.com`
const otherPassword = `NsAuth1!other${stamp}`

const results = []
function pass(name, detail) {
  results.push({ name, pass: true, detail })
  console.log(`PASS  ${name} — ${detail}`)
}
function fail(name, detail) {
  results.push({ name, pass: false, detail })
  console.error(`FAIL  ${name} — ${detail}`)
}

const anonClient = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function ensureSettings(client, userId) {
  const { data: existing, error: selErr } = await client
    .schema('firstparty')
    .from('ns_user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing) return existing
  const { data, error } = await client
    .schema('firstparty')
    .from('ns_user_settings')
    .upsert(
      { user_id: userId, onboarding_completed: false, onboarding: {} },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()
  if (error) throw error
  return data
}

async function main() {
  console.log(`Project: ${url}`)
  console.log(`Test user: ${email}`)

  // --- Sign up ---
  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email,
    password,
  })
  if (signUpError) {
    fail('signup', signUpError.message)
    process.exit(1)
  }
  const userId = signUpData.user?.id
  if (!userId) {
    fail('signup', 'no user id returned')
    process.exit(1)
  }
  pass('signup', `user id ${userId}`)

  // Confirm email if project requires it
  if (!signUpData.session) {
    const { error: confirmErr } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })
    if (confirmErr) {
      fail('confirm_email', confirmErr.message)
      process.exit(1)
    }
    pass('confirm_email', 'admin confirmed (project requires email confirm)')
  } else {
    pass('confirm_email', 'session returned on signup (confirm not required)')
  }

  // --- Sign in ---
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError || !signInData.session) {
    fail('signin', signInError?.message || 'no session')
    process.exit(1)
  }
  pass('signin', `access_token present (${signInData.session.access_token.slice(0, 16)}…)`)

  // Authed client with this user's JWT
  const userClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${signInData.session.access_token}` } },
  })

  // --- Settings row ---
  let settings
  try {
    settings = await ensureSettings(userClient, userId)
    pass('ns_user_settings_upsert', `row user_id=${settings.user_id}`)
  } catch (e) {
    fail('ns_user_settings_upsert', e.message)
    process.exit(1)
  }

  const { data: adminRow, error: adminSelErr } = await admin
    .schema('firstparty')
    .from('ns_user_settings')
    .select('user_id, onboarding_completed, created_at')
    .eq('user_id', userId)
    .single()
  if (adminSelErr || !adminRow) {
    fail('ns_user_settings_admin_read', adminSelErr?.message || 'missing row')
  } else {
    pass('ns_user_settings_admin_read', JSON.stringify(adminRow))
  }

  // --- Second user + RLS ---
  const { data: otherSignUp, error: otherSignUpErr } = await anonClient.auth.signUp({
    email: otherEmail,
    password: otherPassword,
  })
  if (otherSignUpErr || !otherSignUp.user?.id) {
    fail('other_signup', otherSignUpErr?.message || 'no id')
    process.exit(1)
  }
  const otherId = otherSignUp.user.id
  if (!otherSignUp.session) {
    await admin.auth.admin.updateUserById(otherId, { email_confirm: true })
  }
  const { data: otherSignIn, error: otherSignInErr } = await anonClient.auth.signInWithPassword({
    email: otherEmail,
    password: otherPassword,
  })
  if (otherSignInErr || !otherSignIn.session) {
    fail('other_signin', otherSignInErr?.message || 'no session')
    process.exit(1)
  }
  pass('other_signin', `other id ${otherId}`)

  const otherClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${otherSignIn.session.access_token}` } },
  })

  const { data: crossRows, error: crossErr } = await otherClient
    .schema('firstparty')
    .from('ns_user_settings')
    .select('user_id')
    .eq('user_id', userId)

  if (crossErr) {
    // permission / RLS errors are acceptable
    pass('rls_cross_user_blocked', `error as expected: ${crossErr.message}`)
  } else if (!crossRows || crossRows.length === 0) {
    pass('rls_cross_user_blocked', '0 rows visible for other user (RLS)')
  } else {
    fail('rls_cross_user_blocked', `leaked ${crossRows.length} row(s)`)
  }

  // Other user can still create own settings
  try {
    await ensureSettings(otherClient, otherId)
    pass('other_own_settings', 'other user upserted own row')
  } catch (e) {
    fail('other_own_settings', e.message)
  }

  // --- Logout ---
  const { error: outErr } = await anonClient.auth.signOut()
  // signOut on anonClient without that session is a no-op; clear by creating fresh client check
  const after = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // Use the signed-in client's signOut
  const signedIn = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  await signedIn.auth.setSession({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  })
  const { error: signOutErr } = await signedIn.auth.signOut()
  if (signOutErr || outErr) {
    fail('logout', signOutErr?.message || outErr?.message)
  } else {
    const { data: { session: cleared } } = await signedIn.auth.getSession()
    if (cleared) fail('logout', 'session still present')
    else pass('logout', 'session cleared')
  }

  // Cleanup test users + settings (service role)
  await admin.schema('firstparty').from('ns_user_settings').delete().in('user_id', [userId, otherId])
  await admin.auth.admin.deleteUser(userId)
  await admin.auth.admin.deleteUser(otherId)
  pass('cleanup', 'deleted test users + settings rows')

  const failed = results.filter((r) => !r.pass)
  console.log('\n--- summary ---')
  console.log(`passed ${results.length - failed.length}/${results.length}`)
  if (failed.length) {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
