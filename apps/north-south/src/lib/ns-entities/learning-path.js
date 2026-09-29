/**
 * LearningPath → firstparty.ns_learning_paths
 * Base44-shaped list/filter/get/create/update/delete for call sites.
 * Optional FK: goal_id → ns_leadership_goals. lessons stored as jsonb.
 */

const NS_SCHEMA = 'firstparty'
const TABLE = 'ns_learning_paths'

const WRITE_KEYS = [
  'goal_id',
  'title',
  'goal_title',
  'category',
  'focus_area',
  'current_score',
  'target_score',
  'lessons',
  'status',
  'progress_pct',
  'legacy_id',
]

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
    lessons: Array.isArray(row.lessons) ? row.lessons : (row.lessons ?? []),
  }
}

function normalizeValue(key, value) {
  if (value === undefined) return undefined
  if (key === 'goal_id' && value === '') return null
  if (value === '' && key !== 'title') return null
  if (key === 'lessons') {
    if (value == null) return []
    if (Array.isArray(value)) return value
    return []
  }
  return value
}

function pickWriteFields(payload = {}) {
  const row = {}
  for (const key of WRITE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue
    const v = normalizeValue(key, payload[key])
    if (v === undefined) continue
    row[key] = v
  }
  return row
}

function table(supabase) {
  return supabase.schema(NS_SCHEMA).from(TABLE)
}

export function createLearningPathEntity(supabase) {
  async function requireUserId() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!user?.id) throw new Error('LearningPath requires an authenticated user')
    return user.id
  }

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
      q = q.eq(col, normalizeValue(col, value) ?? value)
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
    const userId = await requireUserId()
    const row = {
      ...pickWriteFields(payload),
      user_id: userId,
    }
    if (!row.title) throw new Error('LearningPath.create requires title')
    if (row.status == null) row.status = 'active'
    if (row.progress_pct == null) row.progress_pct = 0
    if (row.lessons == null) row.lessons = []

    const { data, error } = await table(supabase).insert(row).select('*').single()
    if (error) throw error
    return mapRow(data)
  }

  async function update(id, payload = {}) {
    const patch = pickWriteFields(payload)
    patch.updated_at = new Date().toISOString()
    const { data, error } = await table(supabase)
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data ? mapRow(data) : null
  }

  async function remove(id) {
    const { error } = await table(supabase).delete().eq('id', id)
    if (error) throw error
    return true
  }

  return {
    list,
    filter,
    get,
    create,
    update,
    delete: remove,
  }
}
