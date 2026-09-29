/**
 * Commitment milestone evidence — production Supabase + Dashboard / Performance Insights.
 * Usage: node scripts/verify-commitment.mjs
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
const baseUrl = (env.NS_VERIFY_BASE_URL || 'http://127.0.0.1:5177').replace(/\/$/, '')

if (!url || !anon || !service) {
  console.error('Missing URL / anon / service role')
  process.exit(1)
}

const { createLeadershipGoalEntity } = await import(
  pathToFileURL(resolve(appRoot, 'src/lib/ns-entities/leadership-goal.js')).href
)
const { createCoachingSessionEntity } = await import(
  pathToFileURL(resolve(appRoot, 'src/lib/ns-entities/coaching-session.js')).href
)
const { createGoalCheckInEntity } = await import(
  pathToFileURL(resolve(appRoot, 'src/lib/ns-entities/goal-check-in.js')).href
)
const { createCommitmentEntity } = await import(
  pathToFileURL(resolve(appRoot, 'src/lib/ns-entities/commitment.js')).href
)

const stamp = randomBytes(3).toString('hex')
const emailA = `ns-commit-a-${stamp}@example.com`
const passA = `NsCommit1!${stamp}`
const emailB = `ns-commit-b-${stamp}@example.com`
const passB = `NsCommit1!b${stamp}`
const commitmentText = `Practise the pause technique ${stamp}`

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
  if (signInError || !signInData.session) throw new Error(signInError?.message || 'no session')
  return { userId, session: signInData.session }
}

async function authedClient(session) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  return client
}

async function waitForDevServer(timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl + '/')
      if (res.ok) return true
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

async function ensureLoggedIn(page) {
  await page.goto(`${baseUrl}/login?next=/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await page.waitForTimeout(600)
  if (!page.url().includes('/login')) return
  await page.fill('input[type="email"]', emailA)
  await page.fill('input[type="password"]', passA)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
}

async function loginAndGoto(page, path) {
  await ensureLoggedIn(page)
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
  const pathBase = path.split('?')[0]
  if (!page.url().includes(pathBase)) {
    throw new Error(`expected ${pathBase}, got ${page.url()}`)
  }
}

async function assertPage(page, name, { heading, mustInclude = [] }) {
  if (heading) {
    await page.getByRole('heading', { name: heading }).first().waitFor({ timeout: 30000 })
  }
  await page.waitForTimeout(400)
  const body = (await page.locator('body').innerText()).toLowerCase()
  for (const s of mustInclude) {
    if (!body.includes(String(s).toLowerCase())) {
      fail(name, `missing: ${s} (url=${page.url()})`)
      return
    }
  }
  pass(name, `ok url=${page.url().replace(baseUrl, '')}`)
}

async function main() {
  console.log(`Project: ${url}`)
  console.log(`User A: ${emailA}`)
  console.log(`Page base: ${baseUrl}`)

  const a = await signupAndSession(emailA, passA)
  pass('user_a_auth', a.userId)
  const b = await signupAndSession(emailB, passB)
  pass('user_b_auth', b.userId)

  const clientA = await authedClient(a.session)
  const clientB = await authedClient(b.session)

  const goalsA = createLeadershipGoalEntity(clientA)
  const sessionsA = createCoachingSessionEntity(clientA)
  const checkInsA = createGoalCheckInEntity(clientA)
  const commitsA = createCommitmentEntity(clientA)
  const commitsB = createCommitmentEntity(clientB)

  const goal = await goalsA.create({
    title: `Commitment goal ${stamp}`,
    category: 'verbal_communication',
    current_score: 5,
    target_score: 9,
    status: 'active',
  })
  pass('parent_goal', goal.id)

  const coaching = await sessionsA.create({
    title: `Session for commitment ${stamp}`,
    session_type: 'verbal_communication',
    score: 7,
    status: 'reviewed',
  })
  pass('parent_session', coaching.id)

  // Modal-shaped create: empty strings for optional FKs must become null
  const orphan = await commitsA.create({
    session_id: '',
    goal_id: '',
    commitment_text: `Orphan commit ${stamp}`,
    week_label: 'Week of test',
    status: 'pending',
    implemented: false,
    nudge_sent: false,
  })
  if (orphan.session_id == null && orphan.goal_id == null) {
    pass('create_empty_fks_as_null', `id=${orphan.id}`)
  } else {
    fail('create_empty_fks_as_null', JSON.stringify(orphan))
  }

  let created
  try {
    created = await commitsA.create({
      session_id: coaching.id,
      goal_id: goal.id,
      commitment_text: commitmentText,
      week_label: `Week of ${stamp}`,
      status: 'pending',
      implemented: false,
      nudge_sent: false,
    })
    pass(
      'create_linked',
      `id=${created.id} session_id=${created.session_id} goal_id=${created.goal_id} created_date=${created.created_date}`
    )
  } catch (e) {
    fail('create_linked', e.message)
    process.exit(1)
  }

  if (created.user_id !== a.userId) fail('create_user_id', created.user_id)
  else pass('create_user_id', 'matches A')
  if (!created.created_date) fail('created_date_alias', 'missing')
  else pass('created_date_alias', String(created.created_date))

  const listed = await commitsA.list('-created_date', 20)
  if (!listed.find((c) => c.id === created.id)) fail('list', 'missing')
  else pass('list', `n=${listed.length}`)

  // Dashboard-shaped Promise.all slice
  const [, , , , commits] = await Promise.all([
    sessionsA.list('-created_date', 5),
    sessionsA.list('-created_date', 200),
    Promise.resolve([]), // bookings stub
    goalsA.list('-created_date', 50),
    commitsA.list('-created_date', 20),
  ])
  if (!commits.find((c) => c.id === created.id)) fail('dashboard_list_shape', 'missing')
  else pass('dashboard_list_shape', 'commitment in dashboard list')

  // CommitmentsPanel toggle → complete + goal bump + check-in
  const updated = await commitsA.update(created.id, {
    implemented: true,
    status: 'completed',
  })
  if (!updated?.implemented || updated.status !== 'completed') {
    fail('update_complete', JSON.stringify(updated))
  } else {
    pass('update_complete', `implemented=${updated.implemented} status=${updated.status}`)
  }

  const newScore = Math.min(10, (goal.current_score || 5) + 0.5)
  await goalsA.update(goal.id, { current_score: newScore })
  const checkIn = await checkInsA.create({
    goal_id: goal.id,
    score: newScore,
    reflection: `Completed commitment: ${commitmentText}`,
    week_label: created.week_label,
  })
  pass('complete_flow_checkin', `checkin_id=${checkIn.id} score=${checkIn.score}`)

  const { data: adminRow, error: adminErr } = await admin
    .schema('firstparty')
    .from('ns_commitments')
    .select('id, user_id, session_id, goal_id, commitment_text, status, implemented')
    .eq('id', created.id)
    .single()
  if (adminErr || !adminRow) fail('admin_table_row', adminErr?.message || 'missing')
  else if (
    adminRow.user_id === a.userId &&
    adminRow.session_id === coaching.id &&
    adminRow.goal_id === goal.id &&
    adminRow.implemented === true &&
    adminRow.status === 'completed'
  ) {
    pass('admin_table_row', JSON.stringify(adminRow))
  } else fail('admin_table_row', JSON.stringify(adminRow))

  const listB = await commitsB.list('-created_date', 100)
  if (listB.some((c) => c.id === created.id || c.id === orphan.id)) {
    fail('rls_list_isolated', 'B saw A commitments')
  } else pass('rls_list_isolated', `B n=${listB.length}`)

  try {
    const sneaky = await commitsB.update(created.id, { commitment_text: 'Hijacked' })
    if (sneaky == null) pass('rls_update_blocked', 'null')
    else if (sneaky.commitment_text === 'Hijacked') fail('rls_update_blocked', 'updated')
    else fail('rls_update_blocked', JSON.stringify(sneaky))
  } catch (e) {
    pass('rls_update_blocked', e.message)
  }

  // Reset to pending so Dashboard panel shows it as pending
  await commitsA.update(created.id, { implemented: false, status: 'pending' })
  pass('reset_pending_for_ui', 'ready for dashboard panel')

  if (!(await waitForDevServer())) {
    fail('pages', `dev server not at ${baseUrl}`)
  } else {
    pass('dev_server', baseUrl)
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    try {
      await loginAndGoto(page, '/dashboard')
      await assertPage(page, 'page_dashboard', {
        heading: /Executive|Welcome back/i,
        mustInclude: ['Weekly Commitments', commitmentText],
      })

      // Toggle complete in UI — click the circle button in the commitment row
      const commitText = page.getByText(commitmentText, { exact: false }).first()
      await commitText.waitFor({ timeout: 15000 })
      const commitRow = commitText.locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"items-start")][1]')
      await commitRow.locator('button').first().click()
      // Wait for panel refresh / DB write
      await page.waitForTimeout(2500)
      // Also expect completed count text or line-through; poll DB
      let afterUi = null
      for (let i = 0; i < 8; i++) {
        const { data } = await admin
          .schema('firstparty')
          .from('ns_commitments')
          .select('implemented, status')
          .eq('id', created.id)
          .single()
        afterUi = data
        if (data?.implemented === true) break
        await page.waitForTimeout(500)
      }
      if (afterUi?.implemented === true && afterUi?.status === 'completed') {
        pass('page_dashboard_toggle', JSON.stringify(afterUi))
      } else {
        fail('page_dashboard_toggle', JSON.stringify(afterUi))
      }

      await loginAndGoto(page, '/performance-insights')
      await assertPage(page, 'page_performance_insights', {
        heading: 'Performance Insights',
        mustInclude: [],
      })
    } catch (e) {
      fail('page_nav', e.message || String(e))
    }

    await browser.close()
  }

  await admin.schema('firstparty').from('ns_goal_check_ins').delete().eq('goal_id', goal.id)
  await admin.schema('firstparty').from('ns_commitments').delete().in('id', [created.id, orphan.id])
  await admin.schema('firstparty').from('ns_coaching_sessions').delete().eq('id', coaching.id)
  await admin.schema('firstparty').from('ns_leadership_goals').delete().eq('id', goal.id)
  await admin.auth.admin.deleteUser(a.userId)
  await admin.auth.admin.deleteUser(b.userId)
  pass('cleanup', 'deleted commitments/goal/session/users')

  const failed = results.filter((r) => !r.pass)
  console.log('\n--- summary ---')
  console.log(`passed ${results.length - failed.length}/${results.length}`)
  if (failed.length) {
    for (const f of failed) console.error(`  - ${f.name}: ${f.detail}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
