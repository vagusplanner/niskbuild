/**
 * Booking → firstparty.ns_bookings
 *
 * Schema grants authenticated SELECT only. Creates go through
 * POST /api/north-south/bookings (service_role). Confirm via
 * POST /api/north-south/bookings/[id]/confirm (staff). Reschedule/cancel
 * Calendar updates are not in scope yet.
 */

import { apiBase, getNsApiFetchHeaders } from '@/lib/ns-api'

const NS_SCHEMA = 'firstparty'
const TABLE = 'ns_bookings'

const RESCHEDULE_CANCEL_UNAVAILABLE =
  'Booking reschedule/cancel Calendar updates are not available yet. ' +
  'Confirm with Meet is live for staff; reschedule/cancel will follow.'

/** Base44 sort tokens → PostgREST order column (created_date → created_at). */
function parseSort(sort) {
  const raw = typeof sort === 'string' && sort.trim() ? sort.trim() : '-created_date'
  const ascending = !raw.startsWith('-')
  let field = ascending ? raw : raw.slice(1)
  if (field === 'created_date') field = 'created_at'
  if (field === 'updated_date') field = 'updated_at'
  return { column: field, ascending }
}

function mapRow(row) {
  if (!row) return row
  return {
    ...row,
    created_date: row.created_at ?? row.created_date ?? null,
    updated_date: row.updated_at ?? row.updated_date ?? null,
  }
}

function table(supabase) {
  return supabase.schema(NS_SCHEMA).from(TABLE)
}

export function createBookingEntity(supabase) {
  async function list(sort = '-created_date', limit = 100) {
    const { column, ascending } = parseSort(sort)
    let q = table(supabase).select('*').order(column, { ascending })
    if (limit != null) q = q.limit(Number(limit))
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(mapRow)
  }

  async function filter(criteria = {}, sort = '-created_date', limit = 100) {
    const { column, ascending } = parseSort(sort)
    let q = table(supabase).select('*')
    for (const [key, value] of Object.entries(criteria || {})) {
      if (value === undefined) continue
      const col = key === 'created_date' ? 'created_at' : key === 'updated_date' ? 'updated_at' : key
      q = q.eq(col, value)
    }
    q = q.order(column, { ascending })
    if (limit != null) q = q.limit(Number(limit))
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(mapRow)
  }

  async function get(id) {
    const { data, error } = await table(supabase).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? mapRow(data) : null
  }

  async function create(payload = {}) {
    const response = await fetch(`${apiBase()}/api/north-south/bookings`, {
      method: 'POST',
      headers: await getNsApiFetchHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message =
        typeof data?.error === 'string' ? data.error : `Booking create failed (${response.status})`
      throw new Error(message)
    }
    return mapRow(data)
  }

  return {
    list,
    filter,
    get,
    create,
    update: (..._a) =>
      Promise.reject(new Error(`${RESCHEDULE_CANCEL_UNAVAILABLE} (attempted: Booking.update)`)),
    delete: (..._a) =>
      Promise.reject(new Error(`${RESCHEDULE_CANCEL_UNAVAILABLE} (attempted: Booking.delete)`)),
  }
}

export { RESCHEDULE_CANCEL_UNAVAILABLE as BOOKING_WRITE_UNAVAILABLE }
