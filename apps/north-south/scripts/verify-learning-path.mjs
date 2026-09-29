/**
 * LearningPath milestone evidence — production Supabase + /learning page.
 * Usage: node scripts/verify-learning-path.mjs
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
const { createLearningPathEntity } = await import(
  pathToFileURL(resolve(appRoot, 'src/lib/ns-entities/learning-path.js')).href
)

const stamp = randomBytes(3).toString('hex')
const emailA = `ns-path-a-${stamp}@example.com`
const passA = `NsPath1!${stamp}`
const emailB = `ns-path-b-${stamp}@example.com`
const passB = `NsPath1!b${stamp}`
const pathTitle = `E2E Learning Path ${stamp}`
const lessonTitle = `Lesson one ${stamp}`

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
  await page.goto(`${baseUrl}/login?next=/learning`, {
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
  if (!page.url().includes(path.split('?')[0])) {
    throw new Error(`expected ${path}, got ${page.url()}`)
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
  const goalsA = createLeadershipGoalEntity(clientA)
  const pathsA = createLearningPathEntity(clientA)
  const pathsB = createLearningPathEntity(clientB)

  const goal = await goalsA.create({
    title: `Path goal ${stamp}`,
    category: 'executive_presence',
    current_score: 4,
    target_score: 8,
    status: 'active',
  })
  pass('parent_goal', goal.id)

  const lessons = [
    {
      id: 'lesson-0',
      week: 1,
      title: lessonTitle,
      objective: 'Build foundation',
      tool: 'Speech Transcript',
      tool_id: 'speech',
      exercise: 'Record a 60s opener',
      duration_mins: 20,
      completed: false,
    },
    {
      id: 'lesson-1',
      week: 1,
      title: `Lesson two ${stamp}`,
      objective: 'Apply feedback',
      tool: 'Writing Analyser',
      tool_id: 'writing',
      exercise: 'Rewrite an email',
      duration_mins: 25,
      completed: false,
    },
  ]

  let created
  try {
    created = await pathsA.create({
      title: pathTitle,
      goal_id: goal.id,
      goal_title: goal.title,
      category: goal.category,
      focus_area: 'Executive Presence',
      current_score: goal.current_score,
      target_score: goal.target_score,
      lessons,
      status: 'active',
      progress_pct: 0,
    })
    pass(
      'create',
      `id=${created.id} goal_id=${created.goal_id} lessons=${created.lessons?.length} created_date=${created.created_date}`
    )
  } catch (e) {
    fail('create', e.message)
    process.exit(1)
  }

  if (created.user_id !== a.userId) fail('create_user_id', created.user_id)
  else pass('create_user_id', 'matches A')
  if (created.goal_id !== goal.id) fail('goal_id_link', created.goal_id)
  else pass('goal_id_link', 'linked to ns_leadership_goals')
  if (!created.created_date) fail('created_date_alias', 'missing')
  else pass('created_date_alias', String(created.created_date))
  if (!Array.isArray(created.lessons) || created.lessons.length !== 2) {
    fail('lessons_jsonb', JSON.stringify(created.lessons))
  } else pass('lessons_jsonb', `n=${created.lessons.length}`)

  // empty goal_id → null
  const orphan = await pathsA.create({
    title: `Orphan path ${stamp}`,
    goal_id: '',
    lessons: [],
    status: 'active',
  })
  if (orphan.goal_id == null) pass('empty_goal_id_null', orphan.id)
  else fail('empty_goal_id_null', String(orphan.goal_id))

  const listed = await pathsA.list('-created_date', 50)
  if (!listed.find((p) => p.id === created.id)) fail('list', 'missing')
  else pass('list', `n=${listed.length}`)

  // LearningPaths page Promise.all shape
  const [pList, gList] = await Promise.all([
    pathsA.list('-created_date', 50),
    goalsA.filter({ status: 'active' }, '-created_date', 50),
  ])
  if (!pList.find((p) => p.id === created.id) || !gList.find((g) => g.id === goal.id)) {
    fail('learning_page_promise_all', 'missing path or goal')
  } else pass('learning_page_promise_all', 'path+goal resolve')

  // Card-shaped lesson toggle update
  const updatedLessons = created.lessons.map((l) =>
    l.id === 'lesson-0' ? { ...l, completed: true } : l
  )
  const updated = await pathsA.update(created.id, {
    lessons: updatedLessons,
    progress_pct: 50,
    status: 'active',
  })
  if (
    updated?.progress_pct == 50 &&
    updated.lessons?.find((l) => l.id === 'lesson-0')?.completed === true
  ) {
    pass('update_lesson_toggle', `progress_pct=${updated.progress_pct}`)
  } else fail('update_lesson_toggle', JSON.stringify(updated))

  const { data: adminRow, error: adminErr } = await admin
    .schema('firstparty')
    .from('ns_learning_paths')
    .select('id, user_id, goal_id, title, status, progress_pct, lessons')
    .eq('id', created.id)
    .single()
  if (adminErr || !adminRow) fail('admin_table_row', adminErr?.message || 'missing')
  else if (
    adminRow.user_id === a.userId &&
    adminRow.goal_id === goal.id &&
    adminRow.title === pathTitle &&
    Number(adminRow.progress_pct) === 50 &&
    Array.isArray(adminRow.lessons) &&
    adminRow.lessons.length === 2
  ) {
    pass('admin_table_row', `title=${adminRow.title} pct=${adminRow.progress_pct}`)
  } else fail('admin_table_row', JSON.stringify(adminRow))

  const listB = await pathsB.list('-created_date', 50)
  if (listB.some((p) => p.id === created.id)) fail('rls_list_isolated', 'B saw A')
  else pass('rls_list_isolated', `B n=${listB.length}`)

  try {
    const sneaky = await pathsB.update(created.id, { title: 'Hijacked' })
    if (sneaky == null) pass('rls_update_blocked', 'null')
    else if (sneaky.title === 'Hijacked') fail('rls_update_blocked', 'updated')
    else fail('rls_update_blocked', JSON.stringify(sneaky))
  } catch (e) {
    pass('rls_update_blocked', e.message)
  }

  // Reset progress for clean UI lesson toggle; remove orphan so /learning has one card
  await pathsA.update(created.id, {
    lessons,
    progress_pct: 0,
    status: 'active',
  })
  await pathsA.delete(orphan.id)
  pass('ui_fixture_ready', 'single path with 2 incomplete lessons')

  if (!(await waitForDevServer())) {
    fail('pages', `dev server not at ${baseUrl}`)
  } else {
    pass('dev_server', baseUrl)
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    try {
      await loginAndGoto(page, '/learning')
      await page.getByRole('heading', { name: 'Learning Paths' }).waitFor({ timeout: 30000 })
      await page.getByText(pathTitle, { exact: false }).waitFor({ timeout: 20000 })
      pass('page_learning', 'path visible on /learning')

      const pathCard = page.locator('div.bg-card').filter({ hasText: pathTitle }).first()
      await pathCard.getByText(/View \d+ lessons/i).click()
      await pathCard.getByText(lessonTitle, { exact: false }).waitFor({ timeout: 10000 })
      const lessonRow = pathCard.getByText(lessonTitle, { exact: false })
        .locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"gap-4")][1]')
      await lessonRow.locator('button').first().click()

      let afterToggle = null
      for (let i = 0; i < 10; i++) {
        const { data } = await admin
          .schema('firstparty')
          .from('ns_learning_paths')
          .select('progress_pct, lessons, status')
          .eq('id', created.id)
          .single()
        afterToggle = data
        if (Number(data?.progress_pct) === 50) break
        await page.waitForTimeout(400)
      }
      if (Number(afterToggle?.progress_pct) === 50) {
        pass('page_lesson_toggle', `progress_pct=${afterToggle.progress_pct}`)
      } else {
        fail('page_lesson_toggle', JSON.stringify(afterToggle))
      }

      // Delete path from UI (trash is first button in the path card header)
      await pathCard.locator('button').first().click()

      let deleted = false
      for (let i = 0; i < 10; i++) {
        const { data } = await admin
          .schema('firstparty')
          .from('ns_learning_paths')
          .select('id')
          .eq('id', created.id)
          .maybeSingle()
        if (!data) {
          deleted = true
          break
        }
        await page.waitForTimeout(400)
      }
      if (deleted) {
        pass('page_delete', 'path removed from table')
        created = null
      } else {
        fail('page_delete', 'UI delete did not remove row')
      }
    } catch (e) {
      fail('page_nav', e.message || String(e))
    }

    await browser.close()
  }

  // Explicit API delete evidence if UI already deleted primary
  if (created) {
    await pathsA.delete(created.id)
    const gone = await pathsA.get(created.id)
    if (gone == null) pass('api_delete', 'get returns null')
    else fail('api_delete', 'still present')
    created = null
  } else {
    pass('api_delete', 'already deleted via UI')
  }

  await pathsA.delete(orphan.id).catch(() => {})
  await admin.schema('firstparty').from('ns_learning_paths').delete().eq('user_id', a.userId)
  await admin.schema('firstparty').from('ns_leadership_goals').delete().eq('id', goal.id)
  await admin.auth.admin.deleteUser(a.userId)
  await admin.auth.admin.deleteUser(b.userId)
  pass('cleanup', 'deleted paths/goal/users')

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
