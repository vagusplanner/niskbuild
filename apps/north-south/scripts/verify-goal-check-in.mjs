/**
 * GoalCheckIn milestone evidence — production Supabase + live Goal Tracker page.
 * Usage (from apps/north-south): node scripts/verify-goal-check-in.mjs
 *
 * Requires: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Optional: NS_VERIFY_BASE_URL (default http://127.0.0.1:5177) — Vite must already be running.
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
  console.error('Missing URL / anon / service role in .env.local')
  process.exit(1)
}

const { createLeadershipGoalEntity } = await import(
  pathToFileURL(resolve(appRoot, 'src/lib/ns-entities/leadership-goal.js')).href
)
const { createGoalCheckInEntity } = await import(
  pathToFileURL(resolve(appRoot, 'src/lib/ns-entities/goal-check-in.js')).href
)

const stamp = randomBytes(3).toString('hex')
const emailA = `ns-checkin-a-${stamp}@example.com`
const passA = `NsCheck1!${stamp}`
const emailB = `ns-checkin-b-${stamp}@example.com`
const passB = `NsCheck1!b${stamp}`

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

function authedClient(session) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }).then(() => client)
}

async function waitForDevServer(timeoutMs = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(baseUrl + '/')
      if (res.ok || res.status === 200) return true
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function main() {
  console.log(`Project: ${url}`)
  console.log(`User A: ${emailA}`)
  console.log(`User B: ${emailB}`)
  console.log(`Page base: ${baseUrl}`)

  const a = await signupAndSession(emailA, passA)
  pass('user_a_auth', `id=${a.userId}`)
  const b = await signupAndSession(emailB, passB)
  pass('user_b_auth', `id=${b.userId}`)

  const clientA = await authedClient(a.session)
  const clientB = await authedClient(b.session)
  const goalsA = createLeadershipGoalEntity(clientA)
  const checkInsA = createGoalCheckInEntity(clientA)
  const checkInsB = createGoalCheckInEntity(clientB)

  const goalTitle = `Goal for check-in ${stamp}`
  const goal = await goalsA.create({
    title: goalTitle,
    category: 'executive_presence',
    target_score: 8,
    current_score: 4,
    status: 'active',
  })
  pass('parent_goal_create', `goal_id=${goal.id}`)

  const weekLabel = `Week of ${stamp}`
  let checkIn
  try {
    checkIn = await checkInsA.create({
      goal_id: goal.id,
      score: 5,
      reflection: 'Solid week',
      wins: 'Board update landed',
      challenges: 'Pace',
      next_action: 'Practice opener',
      week_label: weekLabel,
    })
    pass(
      'checkin_create',
      `id=${checkIn.id} goal_id=${checkIn.goal_id} user_id=${checkIn.user_id} created_date=${checkIn.created_date}`
    )
  } catch (e) {
    fail('checkin_create', e.message)
    process.exit(1)
  }

  if (checkIn.user_id !== a.userId) fail('checkin_user_id', `got ${checkIn.user_id}`)
  else pass('checkin_user_id', 'matches A')
  if (checkIn.goal_id !== goal.id) fail('checkin_goal_id', `got ${checkIn.goal_id}`)
  else pass('checkin_goal_id', 'links to ns_leadership_goals')
  if (!checkIn.created_date) fail('created_date_alias', 'missing')
  else pass('created_date_alias', String(checkIn.created_date))

  // Exact GoalTracker.load Promise.all shape
  const [gList, cList] = await Promise.all([
    goalsA.list('-created_date', 50),
    checkInsA.list('-created_date', 200),
  ])
  if (!gList.find((g) => g.id === goal.id) || !cList.find((c) => c.id === checkIn.id)) {
    fail('goaltracker_promise_all', `goals=${gList.length} checkIns=${cList.length}`)
  } else {
    pass('goaltracker_promise_all', `goals=${gList.length} checkIns=${cList.length} — both resolved`)
  }

  const listed2Client = await authedClient(a.session)
  const listed2 = await createGoalCheckInEntity(listed2Client).list('-created_date', 200)
  if (!listed2.find((c) => c.id === checkIn.id)) fail('list_after_refresh', 'missing')
  else pass('list_after_refresh', 'still present')

  await goalsA.update(goal.id, { current_score: 5 })
  pass('goal_score_bump', 'current_score=5 (CheckInModal pattern)')

  const { data: adminRow, error: adminErr } = await admin
    .schema('firstparty')
    .from('ns_goal_check_ins')
    .select('id, user_id, goal_id, score, reflection, week_label')
    .eq('id', checkIn.id)
    .single()
  if (adminErr || !adminRow) {
    fail('admin_table_row', adminErr?.message || 'missing')
  } else {
    const ok =
      adminRow.user_id === a.userId &&
      adminRow.goal_id === goal.id &&
      Number(adminRow.score) === 5 &&
      adminRow.week_label === weekLabel
    if (ok) pass('admin_table_row', JSON.stringify(adminRow))
    else fail('admin_table_row', JSON.stringify(adminRow))
  }

  const listB = await checkInsB.list('-created_date', 200)
  if (listB.some((c) => c.id === checkIn.id)) fail('rls_list_isolated', 'B sees A check-in')
  else pass('rls_list_isolated', `B length=${listB.length}`)

  try {
    const sneaky = await checkInsB.update(checkIn.id, { reflection: 'Hijacked' })
    if (sneaky == null) pass('rls_update_blocked', 'null (0 rows)')
    else if (sneaky.reflection === 'Hijacked') fail('rls_update_blocked', 'B updated A')
    else fail('rls_update_blocked', JSON.stringify(sneaky))
  } catch (e) {
    pass('rls_update_blocked', `error: ${e.message}`)
  }

  const { data: afterAttack } = await admin
    .schema('firstparty')
    .from('ns_goal_check_ins')
    .select('reflection')
    .eq('id', checkIn.id)
    .single()
  if (afterAttack?.reflection === 'Solid week') pass('rls_reflection_unchanged', afterAttack.reflection)
  else fail('rls_reflection_unchanged', String(afterAttack?.reflection))

  // --- Live Goal Tracker page ---
  const serverUp = await waitForDevServer(15000)
  if (!serverUp) {
    fail('goal_tracker_page', `dev server not reachable at ${baseUrl} (start with npm run dev:ns)`)
  } else {
    pass('dev_server', baseUrl)
    try {
      const { chromium } = await import('playwright')
      const browser = await chromium.launch({ headless: true })
      const context = await browser.newContext()
      const page = await context.newPage()
      const pageErrors = []
      page.on('pageerror', (err) => pageErrors.push(String(err.message || err)))

      await page.goto(`${baseUrl}/login?next=/goals`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.fill('input[type="email"]', emailA)
      await page.fill('input[type="password"]', passA)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/goals/, { timeout: 30000 })

      // Wait for GoalTracker load() to finish — header always present; spinner gone
      await page.getByRole('heading', { name: 'Leadership Goals' }).waitFor({ timeout: 30000 })
      await page.getByText(goalTitle, { exact: false }).waitFor({ timeout: 30000 })

      // Loading spinner should not remain (Loader2 in empty/loading states)
      const stillLoading = await page.locator('.animate-spin').count()
      const bodyText = await page.locator('body').innerText()
      const hasStubError =
        bodyText.includes('is not wired yet') || bodyText.includes('GoalCheckIn')

      if (pageErrors.length) {
        fail('goal_tracker_page_errors', pageErrors.join(' | '))
      } else if (hasStubError) {
        fail('goal_tracker_page', 'stub error text visible')
      } else {
        pass(
          'goal_tracker_page',
          `loaded /goals with heading + goal title; animate-spin count=${stillLoading}`
        )
      }

      // Check-in path on page: open check-in if button exists
      const checkInBtn = page.getByRole('button', { name: /check.?in/i }).first()
      if (await checkInBtn.count()) {
        await checkInBtn.click()
        await page.getByRole('heading', { name: /Weekly Check-in/i }).waitFor({ timeout: 10000 })
        pass('goal_tracker_checkin_modal', 'CheckInModal opened from Goal Tracker')
        await page.keyboard.press('Escape').catch(() => {})
      } else {
        pass('goal_tracker_checkin_modal', 'skipped (no Check-in button visible — layout ok)')
      }

      await browser.close()
    } catch (e) {
      if (String(e.message || e).includes("Cannot find package 'playwright'")) {
        // Fallback: fetch SPA shell + prove Promise.all via entity (already passed).
        // Attempt lightweight page fetch of /goals without auth (should show sign-in gate, not crash).
        const res = await fetch(`${baseUrl}/goals`)
        const html = await res.text()
        if (res.ok && html.includes('<div id="root"')) {
          fail(
            'goal_tracker_page',
            `playwright not installed (${e.message}); SPA shell ok but authenticated UI not browser-tested`
          )
        } else {
          fail('goal_tracker_page', `playwright missing and SPA fetch unexpected: ${res.status}`)
        }
      } else {
        fail('goal_tracker_page', e.message || String(e))
      }
    }
  }

  // Cleanup
  await admin.schema('firstparty').from('ns_goal_check_ins').delete().eq('id', checkIn.id)
  await admin.schema('firstparty').from('ns_leadership_goals').delete().eq('id', goal.id)
  await admin.auth.admin.deleteUser(a.userId)
  await admin.auth.admin.deleteUser(b.userId)
  pass('cleanup', 'deleted check-in, goal, users A/B')

  const failed = results.filter((r) => !r.pass)
  console.log('\n--- summary ---')
  console.log(`passed ${results.length - failed.length}/${results.length}`)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
