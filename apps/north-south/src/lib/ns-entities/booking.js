/**
 * Booking → firstparty.ns_bookings
 *
 * Schema grants authenticated SELECT only. Inserts/updates/deletes are
 * service_role (create-booking / calendar handlers) — not client PostgREST.
 * This adapter implements real list/filter/get; write methods reject honestly.
 */

const NS_SCHEMA = 'firstparty'
const TABLE = 'ns_bookings'

const WRITE_UNAVAILABLE =
  'Booking writes are not available from the client. ' +
  'ns_bookings is SELECT-only for authenticated users; create/update/cancel ' +
  'require a service-role API handler (not built yet).'

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

function rejectWrite(op) {
  return Promise.reject(new Error(`${WRITE_UNAVAILABLE} (attempted: Booking.${op})`))
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

  return {
    list,
    filter,
    get,
    create: (..._a) => rejectWrite('create'),
    update: (..._a) => rejectWrite('update'),
    delete: (..._a) => rejectWrite('delete'),
  }
}

export { WRITE_UNAVAILABLE as BOOKING_WRITE_UNAVAILABLE }
