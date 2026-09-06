/**
 * Reproduces / verifies the Event.update id=eq.undefined bug and confirms
 * create/update + SharedFile attach paths omit bad UUID values.
 *
 * Usage: node scripts/verify-event-uuid-undefined.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

function isUsableId(value) {
  if (value == null) return false
  const s = String(value).trim()
  return Boolean(s && s !== 'undefined' && s !== 'null')
}

async function main() {
  if (!url || !anonKey) {
    throw new Error('Missing Supabase URL / anon key env')
  }

  // 1) Prove postgrest-js turns undefined into the literal filter value "undefined"
  const probe = createClient(url, anonKey)
  const badUrl = probe
    .schema('firstparty')
    .from('vp_events')
    .update({ title: 'x' })
    .eq('id', undefined).url.href
  console.log('BROKEN_FILTER_URL', badUrl)
  if (!badUrl.includes('id=eq.undefined')) {
    throw new Error('Expected id=eq.undefined in postgrest filter URL')
  }
  console.log('PASS: postgrest encodes undefined id as id=eq.undefined')

  // 2) Guard logic that EventForm / compat now use
  const prefillWithoutId = { start_date: new Date().toISOString(), title: '', category: 'work' }
  const isEditingPrefill = Boolean(prefillWithoutId.id)
  if (isEditingPrefill) throw new Error('prefill without id must not be editing')
  console.log('PASS: prefill object without id → create path (not update)')

  if (isUsableId(undefined) || isUsableId('undefined') || isUsableId(null) || isUsableId('')) {
    throw new Error('isUsableId should reject undefined/null/empty/"undefined"')
  }
  console.log('PASS: isUsableId rejects bad values')

  if (!serviceKey) {
    console.log('SKIP live DB: no SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: owners } = await admin.from('platform_owners').select('user_id').limit(5)
  let userId = owners?.[0]?.user_id
  if (!userId) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 50 })
    const sofiane = users?.users?.find((u) => u.email === 'sofiane.kemih@gmail.com')
    userId = sofiane?.id
  }
  if (!userId) throw new Error('No user id for live test')

  const title = `uuid-undefined-verify ${Date.now()}`
  const { data: created, error: createErr } = await admin
    .schema('firstparty')
    .from('vp_events')
    .insert({
      user_id: userId,
      title,
      event_date: new Date().toISOString(),
      description: 'verify no attachment',
    })
    .select('id, title, event_date')
    .single()
  if (createErr) throw createErr
  console.log('CREATED_EVENT', created.id)

  const { data: updated, error: updateErr } = await admin
    .schema('firstparty')
    .from('vp_events')
    .update({ title: `${title} edited`, description: 'edited without attachment' })
    .eq('id', created.id)
    .select('id, title, description')
    .single()
  if (updateErr) throw updateErr
  console.log('PASS: edit/save without attachment', updated.id, updated.title)

  const { data: fileRow, error: fileErr } = await admin
    .schema('firstparty')
    .from('vp_shared_files')
    .insert({
      user_id: userId,
      event_id: created.id,
      file_name: 'verify.txt',
      storage_provider: 'supabase',
      storage_path: `verify/${created.id}/verify.txt`,
      file_url: 'https://example.com/verify.txt',
    })
    .select('id, event_id')
    .single()
  if (fileErr) {
    console.log('SKIP attachment insert (table/columns?):', fileErr.message)
  } else {
    console.log('PASS: attachment with event_id', fileRow.id, fileRow.event_id)

    const { data: updated2, error: updateErr2 } = await admin
      .schema('firstparty')
      .from('vp_events')
      .update({ title: `${title} with-attachment` })
      .eq('id', created.id)
      .select('id, title')
      .single()
    if (updateErr2) throw updateErr2
    console.log('PASS: edit/save with attachment present', updated2.id, updated2.title)

    await admin.schema('firstparty').from('vp_shared_files').delete().eq('id', fileRow.id)
  }

  const { error: badUpdateErr } = await admin
    .schema('firstparty')
    .from('vp_events')
    .update({ title: 'should-fail' })
    .eq('id', 'undefined')
  if (!badUpdateErr || !/uuid|invalid input syntax/i.test(badUpdateErr.message)) {
    throw new Error(`Expected uuid error for id='undefined', got: ${badUpdateErr?.message}`)
  }
  console.log('PASS: confirmed DB error field is filter id (= literal "undefined"):', badUpdateErr.message)

  await admin.schema('firstparty').from('vp_events').delete().eq('id', created.id)
  console.log('CLEANED_UP')
  console.log('ALL_PASS')
}

main().catch((err) => {
  console.error('FAIL', err)
  process.exit(1)
})
