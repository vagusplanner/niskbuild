/**
 * LeadershipGoal milestone evidence — production Supabase.
 * Usage (from apps/north-south): node scripts/verify-leadership-goal.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
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

const { createLeadershipGoalEntity } = await import(
  pathToFileURL(resolve(appRoot, 'src/lib/ns-entities/leadership-goal.js')).href
)

const stamp = randomBytes(3).toString('hex')
const emailA = `ns-goal-a-${stamp}@example.com`
const passA = `NsGoal1!${stamp}`
const emailB = `ns-goal-b-${stamp}@example.com`
const passB = `NsGoal1!b${stamp}`

const results = []
function pass(name, detail) {
  results.push({ name, pass: true, detail })
  console.log(`PASS  ${name} — ${detail}`)
}
function fail(name, detail) {
  results.push({ name, pass: false, detail })
  console.error(`FAIL  ${name} — ${detail}`)
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function signupAndSession(email, password) {
  const bootstrap = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signUpData, error: signUpError } = await bootstrap.auth.signUp({
    email,
    password,
  })
  if (signUpError) throw signUpError
  const userId = signUpData.user?.id
  if (!userId) throw new Error('no user id')
  if (!signUpData.session) {
    await admin.auth.admin.updateUserById(userId, { email_confirm: true })
  }
  const { data: signInData, error: signInError } = await bootstrap.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError || !signInData.session) {
    throw new Error(signInError?.message || 'no session')
  }
  return { userId, session: signInData.session }
}

async function main() {
  console.log(`Project: ${url}`)
  console.log(`User A: ${emailA}`)
  console.log(`User B: ${emailB}`)

  const a = await signupAndSession(emailA, passA)
  pass('user_a_auth', `id=${a.userId}`)
  const b = await signupAndSession(emailB, passB)
  pass('user_b_auth', `id=${b.userId}`)

  const clientA = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  await clientA.auth.setSession({
    access_token: a.session.access_token,
    refresh_token: a.session.refresh_token,
  })
  const clientB = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  await clientB.auth.setSession({
    access_token: b.session.access_token,
    refresh_token: b.session.refresh_token,
  })

  const goalsA = createLeadershipGoalEntity(clientA)
  const goalsB = createLeadershipGoalEntity(clientB)

  const title = `E2E Leadership Goal ${stamp}`
  let created
  try {
    created = await goalsA.create({
      title,
      description: 'Port milestone evidence',
      category: 'verbal_communication',
      target_score: 9,
      current_score: 5,
      deadline: '2026-12-31',
      status: 'active',
      nudges_enabled: true,
    })
    pass(
      'create',
      `id=${created.id} user_id=${created.user_id} created_date=${created.created_date}`
    )
  } catch (e) {
    fail('create', e.message)
    process.exit(1)
  }

  if (created.user_id !== a.userId) {
    fail('create_user_id', `expected ${a.userId} got ${created.user_id}`)
  } else {
    pass('create_user_id', 'matches auth user A')
  }
  if (!created.created_date) {
    fail('created_date_alias', 'missing created_date on mapped row')
  } else {
    pass('created_date_alias', String(created.created_date))
  }

  const listed = await goalsA.list('-created_date', 50)
  const found = listed.find((g) => g.id === created.id)
  if (!found) {
    fail('list_after_create', `goal not in list (n=${listed.length})`)
  } else {
    pass('list_after_create', `found title=${found.title} alias=${!!found.created_date}`)
  }

  // Persist after "refresh": new client + setSession again, then list
  const clientA2 = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  await clientA2.auth.setSession({
    access_token: a.session.access_token,
    refresh_token: a.session.refresh_token,
  })
  const goalsA2 = createLeadershipGoalEntity(clientA2)
  const listed2 = await goalsA2.list('-created_date', 50)
  if (!listed2.find((g) => g.id === created.id)) {
    fail('list_after_refresh', 'missing after new client session')
  } else {
    pass('list_after_refresh', 'still present')
  }

  const filtered = await goalsA2.filter({ status: 'active' }, '-created_date', 50)
  if (!filtered.find((g) => g.id === created.id)) {
    fail('filter_active', 'not in active filter')
  } else {
    pass('filter_active', 'present')
  }

  const updated = await goalsA2.update(created.id, { current_score: 6, nudges_enabled: false })
  if (updated?.current_score != 6 || updated?.nudges_enabled !== false) {
    fail('update_own', JSON.stringify(updated))
  } else {
    pass('update_own', `score=${updated.current_score} nudges=${updated.nudges_enabled}`)
  }

  const { data: adminRow, error: adminErr } = await admin
    .schema('firstparty')
    .from('ns_leadership_goals')
    .select(
      'id, user_id, title, category, status, current_score, target_score, nudges_enabled, deadline'
    )
    .eq('id', created.id)
    .single()
  if (adminErr || !adminRow) {
    fail('admin_table_row', adminErr?.message || 'missing')
  } else {
    const ok =
      adminRow.user_id === a.userId &&
      adminRow.title === title &&
      adminRow.category === 'verbal_communication' &&
      adminRow.status === 'active' &&
      Number(adminRow.current_score) === 6 &&
      Number(adminRow.target_score) === 9 &&
      adminRow.nudges_enabled === false
    if (ok) pass('admin_table_row', JSON.stringify(adminRow))
    else fail('admin_table_row', `unexpected: ${JSON.stringify(adminRow)}`)
  }

  const listB = await goalsB.list('-created_date', 50)
  if (listB.some((g) => g.id === created.id)) {
    fail('rls_list_isolated', 'B can see A goal')
  } else {
    pass('rls_list_isolated', `B list length=${listB.length}, A goal absent`)
  }

  try {
    const sneaky = await goalsB.update(created.id, { title: 'Hijacked by B' })
    if (sneaky == null) {
      pass('rls_update_blocked', 'update returned null (0 rows)')
    } else if (sneaky.title === 'Hijacked by B') {
      fail('rls_update_blocked', 'B updated A row')
    } else {
      fail('rls_update_blocked', `unexpected return ${JSON.stringify(sneaky)}`)
    }
  } catch (e) {
    pass('rls_update_blocked', `error: ${e.message}`)
  }

  const { data: afterAttack } = await admin
    .schema('firstparty')
    .from('ns_leadership_goals')
    .select('title')
    .eq('id', created.id)
    .single()
  if (afterAttack?.title === title) {
    pass('rls_title_unchanged', afterAttack.title)
  } else {
    fail('rls_title_unchanged', `title now ${afterAttack?.title}`)
  }

  await admin.schema('firstparty').from('ns_leadership_goals').delete().eq('id', created.id)
  await admin.auth.admin.deleteUser(a.userId)
  await admin.auth.admin.deleteUser(b.userId)
  pass('cleanup', 'deleted goal + users A/B')

  const failed = results.filter((r) => !r.pass)
  console.log('\n--- summary ---')
  console.log(`passed ${results.length - failed.length}/${results.length}`)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
