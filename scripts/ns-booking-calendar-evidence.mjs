/**
 * North South booking + Calendar evidence harness.
 * Creates a real booking via POST /api/north-south/bookings, optionally confirms
 * if a coach calendar connection + NS_GOOGLE_CALENDAR_* are available.
 *
 * Usage:
 *   node scripts/ns-booking-calendar-evidence.mjs
 * Env: .env.local (SUPABASE_*, optional NS_GOOGLE_*), NS_API_BASE (default http://127.0.0.1:3000)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

const env = { ...loadEnvFile(resolve(root, '.env.local')), ...process.env }
const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = env.SUPABASE_SERVICE_ROLE_KEY
const apiBase = (env.NS_API_BASE || 'http://127.0.0.1:3000').replace(/\/$/, '')
const coachId = 'fa2f7283-1a5d-401d-8a00-dbc418ae81ef'

if (!url || !anon || !service) {
  console.error('Missing Supabase env')
  process.exit(1)
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const stamp = randomBytes(3).toString('hex')
const email = `ns-book-e2e-${stamp}@example.com`
const password = `NsBook1!${stamp}`

const evidence = {
  created_at: new Date().toISOString(),
  api_base: apiBase,
  ns_foundation: {},
  env: {
    NS_GOOGLE_CALENDAR_CLIENT_ID: Boolean(env.NS_GOOGLE_CALENDAR_CLIENT_ID),
    NS_GOOGLE_CALENDAR_CLIENT_SECRET: Boolean(env.NS_GOOGLE_CALENDAR_CLIENT_SECRET),
    NS_GOOGLE_CALENDAR_REDIRECT_URI: env.NS_GOOGLE_CALENDAR_REDIRECT_URI || null,
  },
  booking: null,
  confirm: null,
  google_event_fetch: null,
  gaps: [],
}

async function main() {
  // Foundation + staff
  const { count: bookingsCount, error: bErr } = await admin
    .schema('firstparty')
    .from('ns_bookings')
    .select('*', { count: 'exact', head: true })
  evidence.ns_foundation.ns_bookings = bErr ? { error: bErr.message } : { ok: true, count: bookingsCount }

  const { data: staff } = await admin.schema('firstparty').from('ns_staff').select('*')
  evidence.ns_foundation.ns_staff = staff || []
  if (!staff?.length) {
    const { data: seeded } = await admin
      .schema('firstparty')
      .from('ns_staff')
      .upsert({ user_id: coachId, role: 'coach' }, { onConflict: 'user_id' })
      .select('*')
    evidence.ns_foundation.ns_staff_seeded = seeded
  }

  const { data: conns } = await admin
    .schema('firstparty')
    .from('ns_google_calendar_connections')
    .select('user_id, calendar_email, token_expiry, updated_at')
  evidence.ns_foundation.ns_google_calendar_connections = conns || []

  // Probe oauth provider
  const { error: providerErr } = await admin.schema('firstparty').from('oauth_states').insert({
    state: `ns-provider-probe-${stamp}`,
    user_id: coachId,
    provider: 'ns_google_calendar',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  })
  if (providerErr) {
    evidence.ns_foundation.oauth_provider_ns_google_calendar = {
      ok: false,
      error: providerErr.message,
    }
    evidence.gaps.push(
      'Apply supabase/ns-google-calendar-oauth-migration.sql so oauth_states accepts ns_google_calendar'
    )
  } else {
    evidence.ns_foundation.oauth_provider_ns_google_calendar = { ok: true }
    await admin.schema('firstparty').from('oauth_states').delete().eq('state', `ns-provider-probe-${stamp}`)
  }

  // Create client user + JWT
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
  const clientToken = signInData.session.access_token

  // Create booking via API
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const bookingBody = {
    client_name: `NS Evidence ${stamp}`,
    client_email: email,
    client_company: 'Evidence Co',
    service_tier: 'hybrid',
    session_type: `1:1 Strategy Session ${stamp}`,
    preferred_date: tomorrow,
    preferred_time: '14:00',
    timezone: 'Europe/London',
    message: 'Evidence booking for Calendar Meet integration',
  }

  const createRes = await fetch(`${apiBase}/api/north-south/bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clientToken}`,
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5177',
    },
    body: JSON.stringify(bookingBody),
  })
  const createJson = await createRes.json().catch(() => ({}))
  evidence.booking = {
    http_status: createRes.status,
    id: createJson.id || null,
    status: createJson.status || null,
    error: createJson.error || null,
    row: createJson.id ? createJson : null,
  }

  if (!createJson.id) {
    evidence.gaps.push('Booking create failed — is Next.js running on NS_API_BASE?')
    writeEvidence(evidence)
    console.error('BOOKING_CREATE_FAILED', createRes.status, createJson)
    process.exit(1)
  }

  console.log('BOOKING_CREATED', createJson.id)

  // Verify in DB
  const { data: dbRow } = await admin
    .schema('firstparty')
    .from('ns_bookings')
    .select('*')
    .eq('id', createJson.id)
    .single()
  evidence.booking.db_verified = Boolean(dbRow?.id)
  evidence.booking.db_status = dbRow?.status || null

  // Coach JWT for confirm
  const { data: coachUser } = await admin.auth.admin.getUserById(coachId)
  const coachEmail = coachUser?.user?.email
  let coachToken = null
  if (coachEmail && env.NS_COACH_PASSWORD) {
    const coachClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: coachSignIn } = await coachClient.auth.signInWithPassword({
      email: coachEmail,
      password: env.NS_COACH_PASSWORD,
    })
    coachToken = coachSignIn?.session?.access_token || null
  }

  // Generate coach magic link session as fallback for evidence
  if (!coachToken) {
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: coachEmail,
    })
    if (!linkErr && linkData?.properties?.hashed_token) {
      const coachClient = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: verified } = await coachClient.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'email',
      })
      coachToken = verified?.session?.access_token || null
    }
  }

  evidence.confirm = { coach_email: coachEmail, coach_token: Boolean(coachToken) }

  if (!coachToken) {
    evidence.gaps.push('Could not obtain coach JWT for confirm')
    writeEvidence(evidence)
    console.log('EVIDENCE_PARTIAL — booking created, confirm skipped (no coach JWT)')
    process.exit(0)
  }

  const confirmRes = await fetch(
    `${apiBase}/api/north-south/bookings/${createJson.id}/confirm`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${coachToken}`,
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5177',
      },
      body: JSON.stringify({}),
    }
  )
  const confirmJson = await confirmRes.json().catch(() => ({}))
  evidence.confirm.http_status = confirmRes.status
  evidence.confirm.response = {
    success: confirmJson.success || false,
    calendar_event_id: confirmJson.calendar_event_id || null,
    meet_link: confirmJson.meet_link || null,
    hangout_link: confirmJson.hangout_link || null,
    google_event_verified: confirmJson.google_event_verified || false,
    google_hangout_link: confirmJson.google_hangout_link || null,
    error: confirmJson.error || null,
    code: confirmJson.code || null,
  }

  if (confirmJson.calendar_event_id) {
    evidence.google_event_fetch = {
      calendar_event_id: confirmJson.calendar_event_id,
      meet_link: confirmJson.meet_link,
      hangout_link: confirmJson.hangout_link || confirmJson.google_hangout_link,
      verified_via_api: Boolean(confirmJson.google_event_verified),
    }
  } else {
    evidence.gaps.push(
      confirmJson.error ||
        'Confirm did not create Calendar event (coach OAuth and/or NS_GOOGLE_CALENDAR_* required)'
    )
  }

  // Cleanup test auth user (keep booking if confirmed for evidence)
  writeEvidence(evidence)
  console.log(JSON.stringify(evidence, null, 2))
  if (!confirmJson.success) process.exit(2)
}

function writeEvidence(obj) {
  const outPath = resolve(root, 'docs/NS_BOOKINGS_CALENDAR_EVIDENCE.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(obj, null, 2) + '\n')
  console.log('WROTE', outPath)
}

main().catch((err) => {
  console.error(err)
  evidence.gaps.push(String(err?.message || err))
  writeEvidence(evidence)
  process.exit(1)
})
