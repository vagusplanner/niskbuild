/**
 * CoachingSession milestone evidence — production Supabase + live pages.
 * Usage: node scripts/verify-coaching-session.mjs
 * Requires Vite at NS_VERIFY_BASE_URL (default http://127.0.0.1:5177).
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

const { createCoachingSessionEntity } = await import(
  pathToFileURL(resolve(appRoot, 'src/lib/ns-entities/coaching-session.js')).href
)

const stamp = randomBytes(3).toString('hex')
const emailA = `ns-session-a-${stamp}@example.com`
const passA = `NsSess1!${stamp}`
const emailB = `ns-session-b-${stamp}@example.com`
const passB = `NsSess1!b${stamp}`
const sessionTitle = `E2E Coaching Session ${stamp}`

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
  await page.waitForTimeout(800)
  if (!page.url().includes('/login')) return
  await page.fill('input[type="email"]', emailA)
  await page.fill('input[type="password"]', passA)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 })
}

async function loginAndGoto(page, path) {
  await ensureLoggedIn(page)
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
  // Auth gate (ClientPortal embeds AuthGuard after load)
  const gate = page.getByRole('heading', { name: /Sign in required/i })
  if (await gate.count()) {
    await ensureLoggedIn(page)
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
  }
  const pathBase = path.split('?')[0]
  if (!page.url().includes(pathBase)) {
    throw new Error(`expected URL containing ${pathBase}, got ${page.url()}`)
  }
}

async function assertPage(page, name, { heading, mustInclude, mustNotInclude = [] }) {
  const pageErrors = []
  const onErr = (err) => pageErrors.push(String(err.message || err))
  page.on('pageerror', onErr)
  try {
    if (heading) {
      await page.getByRole('heading', { name: heading }).first().waitFor({ timeout: 30000 })
    }
    await page.waitForTimeout(500)
    const body = await page.locator('body').innerText()
    const bodyLower = body.toLowerCase()
    const url = page.url()
    for (const s of mustInclude || []) {
      if (!bodyLower.includes(String(s).toLowerCase())) {
        fail(name, `missing text: ${s} (url=${url}; body snippet=${body.slice(0, 180).replace(/\s+/g, ' ')})`)
        return
      }
    }
    for (const s of mustNotInclude) {
      if (bodyLower.includes(String(s).toLowerCase())) {
        fail(name, `unexpected: ${s}`)
        return
      }
    }
    if (pageErrors.some((e) => e.includes('not wired yet') || e.includes('CoachingSession'))) {
      fail(name, `pageerror: ${pageErrors.join(' | ')}`)
      return
    }
    pass(name, `ok url=${url.replace(baseUrl, '')}; pageerrors=${pageErrors.length}`)
  } finally {
    page.off('pageerror', onErr)
  }
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
  const sessionsA = createCoachingSessionEntity(clientA)
  const sessionsB = createCoachingSessionEntity(clientB)

  let created
  try {
    created = await sessionsA.create({
      title: sessionTitle,
      session_type: 'verbal_communication',
      submitted_text: 'Sample transcript for E2E.',
      ai_feedback: 'Clear delivery.',
      score: 7.5,
      strengths: ['Pace', 'Clarity'],
      improvements: ['Fewer fillers'],
      status: 'reviewed',
    })
    pass(
      'create',
      `id=${created.id} user_id=${created.user_id} created_date=${created.created_date}`
    )
  } catch (e) {
    fail('create', e.message)
    process.exit(1)
  }

  if (created.user_id !== a.userId) fail('create_user_id', created.user_id)
  else pass('create_user_id', 'matches A')
  if (!created.created_date) fail('created_date_alias', 'missing')
  else pass('created_date_alias', String(created.created_date))

  const listed = await sessionsA.list('-created_date', 5)
  if (!listed.find((s) => s.id === created.id)) fail('list', 'not found')
  else pass('list', `n=${listed.length}`)

  const filtered = await sessionsA.filter({ status: 'reviewed' }, '-created_date', 50)
  if (!filtered.find((s) => s.id === created.id)) fail('filter_reviewed', 'missing')
  else pass('filter_reviewed', `n=${filtered.length}`)

  // Dashboard-shaped double list
  const [recent, all] = await Promise.all([
    sessionsA.list('-created_date', 5),
    sessionsA.list('-created_date', 200),
  ])
  if (!recent.find((s) => s.id === created.id) || !all.find((s) => s.id === created.id)) {
    fail('dashboard_promise_all', 'session missing')
  } else pass('dashboard_promise_all', 'both lists include session')

  const refreshed = createCoachingSessionEntity(await authedClient(a.session))
  const listed2 = await refreshed.list('-created_date', 50)
  if (!listed2.find((s) => s.id === created.id)) fail('list_after_refresh', 'missing')
  else pass('list_after_refresh', 'present')

  const { data: adminRow, error: adminErr } = await admin
    .schema('firstparty')
    .from('ns_coaching_sessions')
    .select('id, user_id, title, session_type, status, score, strengths, improvements')
    .eq('id', created.id)
    .single()
  if (adminErr || !adminRow) fail('admin_table_row', adminErr?.message || 'missing')
  else if (
    adminRow.user_id === a.userId &&
    adminRow.title === sessionTitle &&
    adminRow.session_type === 'verbal_communication' &&
    adminRow.status === 'reviewed' &&
    Number(adminRow.score) === 7.5
  ) {
    pass('admin_table_row', JSON.stringify(adminRow))
  } else fail('admin_table_row', JSON.stringify(adminRow))

  const listB = await sessionsB.list('-created_date', 50)
  if (listB.some((s) => s.id === created.id)) fail('rls_list_isolated', 'B saw A')
  else pass('rls_list_isolated', `B n=${listB.length}`)

  try {
    const sneaky = await sessionsB.update(created.id, { title: 'Hijacked' })
    if (sneaky == null) pass('rls_update_blocked', 'null')
    else if (sneaky.title === 'Hijacked') fail('rls_update_blocked', 'updated')
    else fail('rls_update_blocked', JSON.stringify(sneaky))
  } catch (e) {
    pass('rls_update_blocked', e.message)
  }

  const { data: after } = await admin
    .schema('firstparty')
    .from('ns_coaching_sessions')
    .select('title')
    .eq('id', created.id)
    .single()
  if (after?.title === sessionTitle) pass('rls_title_unchanged', after.title)
  else fail('rls_title_unchanged', String(after?.title))

  // --- Pages ---
  if (!(await waitForDevServer())) {
    fail('pages', `dev server not at ${baseUrl}`)
  } else {
    pass('dev_server', baseUrl)
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    const stubBan = ['is not wired yet', 'entities.CoachingSession']

    const pages = [
      async () => {
        await loginAndGoto(page, '/dashboard')
        await assertPage(page, 'page_dashboard', {
          heading: /Executive|Welcome back/i,
          mustInclude: [sessionTitle],
          mustNotInclude: stubBan,
        })
      },
      async () => {
        await loginAndGoto(page, '/portal')
        await assertPage(page, 'page_client_portal', {
          heading: /Welcome back/i,
          mustInclude: ['Client Portal'],
          mustNotInclude: stubBan,
        })
      },
      async () => {
        await loginAndGoto(page, '/resources')
        await assertPage(page, 'page_resources', {
          heading: 'Resource Library',
          mustInclude: ['Knowledge Base'],
          mustNotInclude: stubBan,
        })
      },
      async () => {
        await loginAndGoto(page, '/performance-insights')
        await assertPage(page, 'page_performance_insights', {
          heading: 'Performance Insights',
          mustInclude: [],
          mustNotInclude: stubBan,
        })
      },
      async () => {
        await loginAndGoto(page, '/learning')
        await assertPage(page, 'page_learning_paths', {
          heading: 'Learning Paths',
          mustInclude: ['AI-Personalised'],
          mustNotInclude: stubBan,
        })
      },
      async () => {
        await loginAndGoto(page, '/ai-coach')
        await assertPage(page, 'page_ai_coach_shell', {
          heading: /Your personal coach/i,
          mustInclude: ['AI Communication Coach'],
          mustNotInclude: stubBan,
        })

        await page.getByRole('button', { name: /Progress Tracker/i }).click()
        await page.getByText(sessionTitle, { exact: false }).waitFor({ timeout: 20000 })
        await assertPage(page, 'page_progress_tracker', {
          mustInclude: [sessionTitle, 'Your Progress'],
          mustNotInclude: stubBan,
        })

        await page.goto(`${baseUrl}/ai-coach`, { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: /Speech Transcript/i }).click()
        await page.waitForTimeout(800)
        await assertPage(page, 'page_speech_analyser', {
          mustInclude: [],
          mustNotInclude: stubBan,
        })

        await page.goto(`${baseUrl}/ai-coach`, { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: /Role-Play Practice/i }).click()
        await page.waitForTimeout(800)
        await assertPage(page, 'page_roleplay', {
          mustInclude: [],
          mustNotInclude: stubBan,
        })

        await page.goto(`${baseUrl}/ai-coach`, { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: /Video Analysis/i }).click()
        await page.waitForTimeout(800)
        await assertPage(page, 'page_video_analyser', {
          mustInclude: [],
          mustNotInclude: stubBan,
        })
      },
    ]

    for (const run of pages) {
      try {
        await run()
      } catch (e) {
        fail('page_nav', e.message || String(e))
      }
    }

    await browser.close()
  }

  await admin.schema('firstparty').from('ns_coaching_sessions').delete().eq('id', created.id)
  await admin.auth.admin.deleteUser(a.userId)
  await admin.auth.admin.deleteUser(b.userId)
  pass('cleanup', 'session + users deleted')

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
