/**
 * North South Phase 1 integrations evidence — real Groq / Storage / Resend calls.
 * Usage (from monorepo root): node apps/north-south/scripts/verify-phase1-integrations.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
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
const apiBase = (env.VITE_API_BASE_URL || process.env.NS_EVIDENCE_API_BASE || 'http://127.0.0.1:3000').replace(
  /\/$/,
  ''
)
const resendKey = env.RESEND_API_KEY

if (!url || !anon || !service) {
  console.error('Missing URL / anon / service role in .env.local')
  process.exit(1)
}

const stamp = randomBytes(3).toString('hex')
const email = `ns-p1-int-${stamp}@example.com`
const password = `NsP1!${stamp}`

const evidence = {
  generated_at: new Date().toISOString(),
  api_base: apiBase,
  email_from_ns: env.EMAIL_FROM_NS || 'North South <hello@niskbuild.com> (default)',
  env_presence: {
    GROQ_API_KEY: Boolean(env.GROQ_API_KEY),
    RESEND_API_KEY: Boolean(env.RESEND_API_KEY),
    EMAIL_FROM: env.EMAIL_FROM || null,
    EMAIL_FROM_NS: env.EMAIL_FROM_NS || null,
    EMAIL_FROM_VP: env.EMAIL_FROM_VP || null,
  },
  resend_verified_domains: [],
  tests: {},
}

const anonClient = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function redactUrl(u) {
  if (!u || typeof u !== 'string') return u
  try {
    const parsed = new URL(u)
    if (parsed.searchParams.has('token')) parsed.searchParams.set('token', '[REDACTED]')
    return parsed.toString().replace(/token=[^&]+/gi, 'token=[REDACTED]')
  } catch {
    return '[url]'
  }
}

/** Minimal valid WAV (silence + short tone-ish noise) — Whisper accepts wav. */
function buildTinyWav() {
  // 16-bit PCM mono 16kHz, ~1.2s of a simple square-ish tone + silence padding
  const sampleRate = 16000
  const durationSec = 1.5
  const numSamples = Math.floor(sampleRate * durationSec)
  const dataSize = numSamples * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    // 440Hz tone for first 0.8s so Whisper has signal; then silence
    const sample =
      t < 0.8 ? Math.floor(Math.sin(2 * Math.PI * 440 * t) * 12000) : 0
    buffer.writeInt16LE(sample, 44 + i * 2)
  }
  return buffer
}

async function waitForReady(timeoutMs = 90_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${apiBase}/api/north-south/email`, { method: 'OPTIONS' })
      // 204 or 403 both mean the route exists
      if (res.status === 204 || res.status === 403 || res.status === 200) return true
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return false
}

async function main() {
  console.log(`API base: ${apiBase}`)
  console.log(`Waiting for Next.js...`)
  const ready = await waitForReady()
  if (!ready) {
    console.error('Next.js API not reachable at', apiBase)
    process.exit(1)
  }
  console.log('API ready')

  if (resendKey) {
    try {
      const domRes = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${resendKey}`, Accept: 'application/json' },
      })
      if (domRes.ok) {
        const dom = await domRes.json()
        evidence.resend_verified_domains = (dom.data || []).map((d) => ({
          name: d.name,
          status: d.status,
          id: d.id,
        }))
      }
    } catch (e) {
      evidence.resend_verified_domains_error = String(e)
    }
  }

  // --- Auth bootstrap ---
  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email,
    password,
  })
  if (signUpError) {
    console.error('signup failed', signUpError.message)
    process.exit(1)
  }
  let userId = signUpData.user?.id
  let accessToken = signUpData.session?.access_token
  if (!accessToken && userId) {
    await admin.auth.admin.updateUserById(userId, { email_confirm: true })
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      console.error('signin failed', signInError.message)
      process.exit(1)
    }
    accessToken = signInData.session?.access_token
    userId = signInData.user?.id
  }
  if (!accessToken || !userId) {
    console.error('No access token')
    process.exit(1)
  }
  evidence.auth = { user_id: userId, email, note: 'ephemeral test user — delete after' }
  console.log('Auth OK', userId)

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  // --- 1. LLM ---
  {
    const started = new Date().toISOString()
    const res = await fetch(`${apiBase}/api/north-south/llm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        prompt:
          'You are an executive communication coach. Give one concise tip (max 25 words) for clearer presentations.',
      }),
    })
    const data = await res.json().catch(() => ({}))
    evidence.tests.llm = {
      started_at: started,
      finished_at: new Date().toISOString(),
      http_status: res.status,
      ok: res.ok && typeof data.text === 'string' && data.text.length > 0,
      response_snippet: typeof data.text === 'string' ? data.text.slice(0, 280) : data,
      route: '/api/north-south/llm',
      provider: 'groq',
    }
    console.log('LLM', evidence.tests.llm.ok ? 'PASS' : 'FAIL', evidence.tests.llm.response_snippet)
  }

  // --- 2. Upload + Transcribe ---
  {
    const started = new Date().toISOString()
    const wav = buildTinyWav()
    const form = new FormData()
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'ns_phase1_tone.wav')

    const upRes = await fetch(`${apiBase}/api/north-south/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    })
    const upData = await upRes.json().catch(() => ({}))
    const storagePath = upData.storage_path || upData.path
    const fileUrl = upData.file_url

    let trData = null
    let trStatus = null
    if (upRes.ok && fileUrl) {
      const trRes = await fetch(`${apiBase}/api/north-south/transcribe`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ audio_url: fileUrl }),
      })
      trStatus = trRes.status
      trData = await trRes.json().catch(() => ({}))
    }

    evidence.tests.upload_transcribe = {
      started_at: started,
      finished_at: new Date().toISOString(),
      upload_http_status: upRes.status,
      upload_ok: upRes.ok && typeof storagePath === 'string' && storagePath.startsWith('ns/'),
      storage_path: storagePath || null,
      file_url_redacted: redactUrl(fileUrl),
      transcribe_http_status: trStatus,
      transcribe_ok: Boolean(trData && (trData.text || trData.transcript)),
      transcript_snippet: (trData?.text || trData?.transcript || trData?.error || '').toString().slice(0, 280),
      provider: trData?.provider || null,
      model: trData?.model || null,
      note:
        'Synthetic 440Hz tone WAV — Whisper may return empty-ish or descriptive text; upload path + successful API call are the hard requirements.',
    }
    console.log(
      'Upload+Transcribe',
      evidence.tests.upload_transcribe.upload_ok && evidence.tests.upload_transcribe.transcribe_ok
        ? 'PASS'
        : 'PARTIAL/FAIL',
      storagePath,
      evidence.tests.upload_transcribe.transcript_snippet
    )
  }

  // --- 3. Email via Resend ---
  {
    const started = new Date().toISOString()
    const subject = `[NS Phase1 Evidence] integrations check ${stamp}`
    const body = `North South Phase 1 evidence email.\nStamp: ${stamp}\nTimestamp: ${started}\nThis is an automated delivery check via /api/north-south/email.`
    const to = 'sofiane.kemih@gmail.com'
    const res = await fetch(`${apiBase}/api/north-south/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body }),
    })
    const data = await res.json().catch(() => ({}))
    const emailId = data.id || null

    let delivery = null
    if (emailId && resendKey) {
      // Poll Resend for delivery event
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 2500))
        try {
          const getRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
            headers: { Authorization: `Bearer ${resendKey}`, Accept: 'application/json' },
          })
          if (getRes.ok) {
            delivery = await getRes.json()
            const ev = delivery.last_event
            if (ev && ev !== 'queued' && ev !== 'sent') break
            if (ev === 'delivered') break
          }
        } catch {
          // continue
        }
      }
    }

    evidence.tests.email = {
      started_at: started,
      finished_at: new Date().toISOString(),
      http_status: res.status,
      ok: res.ok && Boolean(emailId),
      resend_id: emailId,
      to,
      from: evidence.email_from_ns,
      subject,
      last_event: delivery?.last_event || null,
      delivered: delivery?.last_event === 'delivered',
      message_id: delivery?.message_id || null,
      route: '/api/north-south/email',
    }
    console.log(
      'Email',
      evidence.tests.email.ok ? 'SENT' : 'FAIL',
      emailId,
      'last_event=',
      evidence.tests.email.last_event
    )
  }

  // Cleanup test user
  try {
    await admin.auth.admin.deleteUser(userId)
    evidence.auth.cleaned_up = true
  } catch (e) {
    evidence.auth.cleaned_up = false
    evidence.auth.cleanup_error = String(e)
  }

  const outPath = resolve(monorepoRoot, 'docs/NS_PHASE1_INTEGRATIONS_EVIDENCE.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(evidence, null, 2) + '\n')
  console.log('Wrote', outPath)

  const allOk =
    evidence.tests.llm?.ok &&
    evidence.tests.upload_transcribe?.upload_ok &&
    evidence.tests.upload_transcribe?.transcribe_ok &&
    evidence.tests.email?.ok

  process.exit(allOk ? 0 : 2)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
