// =============================================
// Base44 Compatibility Layer for Vagus Planner
// Maps Base44 SDK calls to Supabase
// =============================================

import { createClient } from '@supabase/supabase-js'
import { redirectToVpLogin } from './static-bundle'
import { mapSupabaseUserToVpUser } from './vp-auth-user'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/** Bearer token for cross-origin VP API calls (e.g. Capacitor). Web preview still uses cookies. */
export async function getVpApiFetchHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Cookie session may still authenticate same-origin web requests.
  }
  return headers
}

const FIRSTPARTY_SCHEMA = 'firstparty'

// Entity mapping: Base44 entity names → Supabase table names (firstparty schema)
const ENTITY_TABLES = {
  Task: 'vp_tasks',
  UserSettings: 'vp_user_settings',
  Category: 'vp_categories',
  Event: 'vp_events',
  Holiday: 'vp_holidays',
  Reflection: 'vp_reflections',
  Expense: 'vp_expenses',
  Goal: 'vp_goals',
  LifeGoal: 'vp_goals',
  PrayerLog: 'vp_prayer_logs',
  Period: 'vp_periods',
  IslamicEvent: 'vp_islamic_events',
  ConflictResolution: 'vp_conflict_resolutions',
  Habit: 'vp_habits',
  HabitCompletion: 'vp_habit_completions',
  SharedCalendar: 'vp_shared_calendars',
  GroupCalendar: 'vp_group_calendars',
  Team: 'vp_teams',
  TeamMember: 'vp_team_members',
  GroupMessage: 'vp_group_messages',
  GroupChat: 'vp_group_chats',
  Meeting: 'vp_meetings',
  Subscription: 'vp_subscriptions',
  Invoice: 'vp_invoices',
  Usage: 'vp_usage',
  NotificationPreference: 'vp_notification_preferences',
  Notification: 'vp_notifications',
  Chat: 'vp_chats',
  LiveLocation: 'vp_live_locations',
}

function tableFrom(tableName) {
  return supabase.schema(FIRSTPARTY_SCHEMA).from(tableName)
}

// Base44 field names → Supabase column names
const COLUMN_ALIASES = {
  updated_date: 'updated_at',
  created_date: 'created_at',
  completion_date: 'completed_at',
  start_date: 'due_date',
}

const ENTITY_COLUMN_ALIASES = {
  Event: { start_date: 'event_date' },
  Task: { description: 'notes' },
}

const TASK_PRIORITY_MAP = { low: 1, medium: 2, high: 3, urgent: 3 }
const TASK_STATUS_MAP = {
  todo: 'pending',
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  done: 'completed',
  cancelled: 'cancelled',
}

function mapTaskPriority(value) {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.min(3, Math.max(0, value))
  }
  if (typeof value === 'string') return TASK_PRIORITY_MAP[value.toLowerCase()] ?? 2
  return 2
}

function mapTaskStatus(value) {
  if (typeof value === 'string') return TASK_STATUS_MAP[value.toLowerCase()] ?? 'pending'
  return 'pending'
}

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Base44 field names → Supabase columns for insert/update */
function mapPayloadToRow(entityName, payload, userId) {
  const p = payload ?? {}

  if (entityName === 'Event') {
    const row = {}
    if (userId) row.user_id = userId
    if (p.title != null) row.title = p.title
    if (p.description != null) row.description = p.description
    if (p.location != null) row.location = p.location
    const start = p.start_date ?? p.event_date
    if (start != null) row.event_date = start
    return row
  }

  if (entityName === 'Task') {
    const row = {}
    if (userId) row.user_id = userId
    if (p.title != null && String(p.title).trim()) row.title = String(p.title).trim()
    else if (userId) row.title = 'Untitled'
    const notes = p.notes ?? p.description
    if (notes != null && String(notes).trim()) row.notes = String(notes).trim()
    if (p.due_date != null && p.due_date !== '') {
      const due = new Date(p.due_date)
      if (!Number.isNaN(due.getTime())) row.due_date = due.toISOString()
    }
    if (p.priority != null) row.priority = mapTaskPriority(p.priority)
    if (p.status != null) row.status = mapTaskStatus(p.status)
    else if (userId && row.title) row.status = 'pending'
    if (p.event_id != null && p.event_id !== '') row.event_id = p.event_id
    return row
  }

  if (entityName === 'Expense') {
    const row = { amount: p.amount ?? 0 }
    if (userId) row.user_id = userId
    if (p.category != null) row.category = p.category
    const desc = p.description ?? p.notes ?? p.title
    if (desc != null) row.description = desc
    if (p.date != null) row.date = p.date
    return row
  }

  if (entityName === 'Holiday') {
    const row = { name: p.name ?? p.title ?? 'Holiday' }
    if (userId) row.user_id = userId
    const start = p.holiday_date ?? p.start_date
    if (start != null) row.holiday_date = String(start).split('T')[0]
    const notes = p.notes ?? p.description
    if (notes != null) row.notes = notes
    if (p.recurring_yearly != null) row.recurring_yearly = p.recurring_yearly
    return row
  }

  if (entityName === 'Reflection') {
    const row = {
      content: p.content ?? p.description ?? p.title ?? '',
    }
    if (userId) row.user_id = userId
    if (p.date != null) row.date = p.date
    return row
  }

  if (entityName === 'Goal' || entityName === 'LifeGoal') {
    const statusMap = {
      in_progress: 'active',
      active: 'active',
      completed: 'completed',
      archived: 'archived',
    }
    const row = { title: p.title ?? 'Goal' }
    if (userId) row.user_id = userId
    if (p.description != null) row.description = p.description
    if (p.target_date != null) row.target_date = p.target_date
    else if (p.due_date != null) row.target_date = p.due_date
    if (p.status != null) row.status = statusMap[p.status] ?? p.status
    if (p.progress != null) row.progress = p.progress
    return row
  }

  const row = { ...p }
  if (userId && row.user_id == null) row.user_id = userId
  return row
}

const USER_SETTINGS_COLUMN_MAP = {
  notifications_enabled: 'push_notifications_enabled',
  email_notifications: 'email_notifications_enabled',
  notify_prayer: 'prayer_reminders_enabled',
  notify_events: 'event_reminders_enabled',
  notify_tasks: 'task_due_reminders_enabled',
}

function mapUserSettingsPayloadToRow(payload, existingRow, userId) {
  const p = { ...(payload ?? {}) }
  const row = {}
  if (userId) row.user_id = userId

  const prefs = {
    ...(existingRow?.preferences && typeof existingRow.preferences === 'object'
      ? existingRow.preferences
      : {}),
  }

  for (const [appKey, col] of Object.entries(USER_SETTINGS_COLUMN_MAP)) {
    if (appKey in p) {
      row[col] = p[appKey] !== false
      prefs[appKey] = p[appKey]
      delete p[appKey]
    }
  }

  if ('edition' in p) {
    row.edition = p.edition
    delete p.edition
  }
  if ('timezone' in p) {
    row.timezone = p.timezone
    delete p.timezone
  }

  for (const [key, value] of Object.entries(p)) {
    if (['id', 'user_id', 'created_at', 'updated_at', 'preferences'].includes(key)) continue
    prefs[key] = value
  }

  if (Object.keys(prefs).length > 0) row.preferences = prefs
  return row
}

function mapUserSettingsFromRow(row) {
  if (!row) return row
  const prefs =
    row.preferences && typeof row.preferences === 'object' && !Array.isArray(row.preferences)
      ? row.preferences
      : {}
  return {
    ...row,
    ...prefs,
    notifications_enabled: row.push_notifications_enabled !== false,
    email_notifications: row.email_notifications_enabled !== false,
    notify_prayer: row.prayer_reminders_enabled !== false,
    notify_events: row.event_reminders_enabled !== false,
    notify_tasks: row.task_due_reminders_enabled !== false,
  }
}

/** Supabase columns → Base44 field names for reads */
function mapRowFromDb(entityName, row) {
  if (!row) return row

  if (entityName === 'UserSettings') {
    return mapUserSettingsFromRow(row)
  }

  if (entityName === 'Event') {
    const start = row.event_date ?? row.start_date ?? row.date
    return {
      ...row,
      start_date: start,
      end_date: row.end_date ?? start,
    }
  }

  if (entityName === 'Task') {
    const priorityLabels = { 0: 'low', 1: 'low', 2: 'medium', 3: 'high' }
    return {
      ...row,
      description: row.notes ?? row.description,
      event_id: row.event_id ?? null,
      status: row.status === 'pending' ? 'todo' : row.status,
      priority:
        typeof row.priority === 'number'
          ? (priorityLabels[row.priority] ?? 'medium')
          : row.priority,
    }
  }

  if (entityName === 'Holiday') {
    return {
      ...row,
      title: row.name ?? row.title,
      start_date: row.holiday_date ?? row.start_date,
    }
  }

  return row
}

function mapColumn(column, entityName) {
  const entityAlias = ENTITY_COLUMN_ALIASES[entityName]?.[column]
  if (entityAlias) return entityAlias
  return COLUMN_ALIASES[column] ?? column
}

function parseSortString(sort) {
  if (!sort || typeof sort !== 'string') return null
  const descending = sort.startsWith('-')
  const column = descending ? sort.slice(1) : sort
  return { column, ascending: !descending }
}

function applySort(query, sortField, entityName) {
  const parsed = parseSortString(sortField)
  if (!parsed) return query
  const column = mapColumn(parsed.column, entityName)
  return query.order(column, { ascending: parsed.ascending, nullsFirst: false })
}

function applyFilters(query, criteria, entityName) {
  let next = query
  for (const [key, value] of Object.entries(criteria ?? {})) {
    next = next.eq(mapColumn(key, entityName), value)
  }
  return next
}

/** Resolve list() args: sort-only, sort+limit, filters, or filters+sort+limit */
function resolveListArgs(args) {
  let filters = {}
  let sortField = null
  let limit

  if (args.length === 0) {
    return { filters, sortField, limit }
  }

  if (typeof args[0] === 'string') {
    sortField = args[0]
    if (typeof args[1] === 'number') limit = args[1]
    return { filters, sortField, limit }
  }

  if (args[0] && typeof args[0] === 'object') {
    filters = args[0]
    if (typeof args[1] === 'string') {
      sortField = args[1]
      if (typeof args[2] === 'number') limit = args[2]
    } else if (typeof args[1] === 'number') {
      limit = args[1]
    }
  }

  return { filters, sortField, limit }
}

function resolveEntityKey(name) {
  if (!name || typeof name !== 'string') return null
  if (ENTITY_TABLES[name]) return name
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1)
  if (ENTITY_TABLES[capitalized]) return capitalized
  const singular = capitalized.replace(/s$/, '')
  if (ENTITY_TABLES[singular]) return singular
  return null
}

function buildListQuery(tableName, entityName, args) {
  const { filters, sortField, limit } = resolveListArgs(args)
  let query = tableFrom(tableName).select('*')
  query = applyFilters(query, filters, entityName)
  query = applySort(query, sortField, entityName)
  if (typeof limit === 'number') {
    query = query.limit(limit)
  }
  return query
}

function createStubEntityApi() {
  return {
    list: async () => [],
    get: async () => null,
    create: async () => null,
    update: async () => null,
    delete: async () => null,
    filter: async () => [],
    subscribe: () => () => {},
  }
}

// =============================================
// Base44 Compatible Client
// =============================================

export const base44 = {
  // Database operations
  db: {
    from: (table) => {
      console.log(`🔍 Querying: ${table}`)
      return supabase.from(table)
    },
    auth: {
      getUser: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        return user
      },
      getSession: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return session
      }
    },
    storage: {
      from: (bucket) => supabase.storage.from(bucket)
    }
  },

  // =============================================
  // Authentication
  // =============================================
  
  auth: {
    getCurrentUser: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    getUser: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    },
    loginViaEmailPassword: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    },
    signUp: async (email, password, metadata) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      })
      if (error) throw error
      return data
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    },
    /** Alias used by older UI — same as signOut */
    logout: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    },
    /**
     * GDPR erasure entry point used by AccountDeletionDialog historically.
     * Delegates to deleteUserAccount → /api/account/delete (full vp_* purge).
     */
    deleteMe: async () => {
      const result = await base44.functions.invoke('deleteUserAccount', {})
      const payload = result?.data ?? result
      if (payload && payload.success === false) {
        throw new Error(payload.error || payload.message || 'Account deletion failed')
      }
      return payload
    },
    onAuthStateChange: (callback) => {
      return supabase.auth.onAuthStateChange(callback)
    },
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return mapSupabaseUserToVpUser(user)
    },
    isAuthenticated: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return !!user
    },
    redirectToLogin: (nextPath) => {
      redirectToVpLogin(typeof nextPath === 'string' ? nextPath : '/dashboard')
    },
    updateMe: async (updates) => {
      const { data, error } = await supabase.auth.updateUser(updates)
      if (error) throw error
      return data
    }
  },

  // =============================================
  // Entity CRUD (maps to firstparty tables)
  // =============================================

  list: async (entityName, ...args) => {
    const key = resolveEntityKey(entityName)
    if (!key) {
      console.warn(`⚠️ Entity "${entityName}" not mapped. Add to ENTITY_TABLES`)
      return []
    }
    return base44.entities[key].list(...args)
  },
  
  entities: new Proxy({}, {
    get: (target, entityName) => {
      const tableName = ENTITY_TABLES[entityName]
      
      if (!tableName) {
        console.warn(`⚠️ Entity "${entityName}" not mapped. Add to ENTITY_TABLES`)
        return createStubEntityApi()
      }
      
      return {
        list: async (...args) => {
          const { data, error } = await buildListQuery(tableName, entityName, args)
          if (error) throw error
          return (data ?? []).map((row) => mapRowFromDb(entityName, row))
        },
        filter: async (criteria = {}, sortField, limit) => {
          let query = tableFrom(tableName).select('*')
          query = applyFilters(query, criteria, entityName)
          if (typeof sortField === 'string') {
            query = applySort(query, sortField, entityName)
          }
          if (typeof limit === 'number') {
            query = query.limit(limit)
          }
          const { data, error } = await query
          if (error) throw error
          return (data ?? []).map((row) => mapRowFromDb(entityName, row))
        },
        get: async (id) => {
          const { data, error } = await tableFrom(tableName)
            .select('*')
            .eq('id', id)
            .single()
          if (error) throw error
          return mapRowFromDb(entityName, data)
        },
        create: async (payload) => {
          const userId = await getCurrentUserId()
          let row
          if (entityName === 'UserSettings') {
            row = mapUserSettingsPayloadToRow(payload, null, userId)
          } else {
            row = mapPayloadToRow(entityName, payload, userId)
          }
          const { data, error } = await tableFrom(tableName)
            .insert([row])
            .select()
          if (error) throw error
          return mapRowFromDb(entityName, data[0])
        },
        update: async (id, payload) => {
          let row
          if (entityName === 'UserSettings') {
            const { data: existing, error: readError } = await tableFrom(tableName)
              .select('*')
              .eq('id', id)
              .single()
            if (readError) throw readError
            row = mapUserSettingsPayloadToRow(payload, existing, null)
          } else {
            row = mapPayloadToRow(entityName, payload, null)
          }
          const { data, error } = await tableFrom(tableName)
            .update(row)
            .eq('id', id)
            .select()
          if (error) throw error
          return mapRowFromDb(entityName, data[0])
        },
        delete: async (id) => {
          const { error } = await tableFrom(tableName).delete().eq('id', id)
          if (error) throw error
          return { success: true }
        },
        // Realtime not wired in compat layer yet — no-op for legacy subscribers
        subscribe: () => () => {},
      }
    }
  }),

  // =============================================
  // Functions/Invoke (for AI)
  // =============================================
  
  functions: {
    invoke: async (name, payload) => {
      console.log(`📡 Invoke function: ${name}`, payload)
      try {
        const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
        const response = await fetch(`${apiBase}/api/vagus-planner/functions`, {
          method: 'POST',
          headers: await getVpApiFetchHeaders(),
          credentials: 'include',
          body: JSON.stringify({ function: name, payload: payload ?? {} }),
        })

        const data = await response.json()

        if (!response.ok) {
          const message =
            typeof data?.error === 'string'
              ? data.error
              : `Function "${name}" request failed`
          throw new Error(message)
        }

        return data
      } catch (error) {
        console.error('❌ Error invoking function:', error)
        throw error
      }
    }
  },

  // =============================================
  // Integrations
  // =============================================
  
  integrations: {
    Core: {
      InvokeLLM: async (params) => {
        const normalized =
          typeof params === 'string'
            ? { prompt: params }
            : params && typeof params === 'object'
              ? params
              : { prompt: '' }

        const requestBody = {
          prompt: normalized.prompt,
        }
        if (normalized.response_json_schema) {
          requestBody.response_json_schema = normalized.response_json_schema
        }
        if (normalized.add_context_from_internet !== undefined) {
          requestBody.add_context_from_internet = normalized.add_context_from_internet
        }
        if (normalized.model) {
          requestBody.model = normalized.model
        }
        // Optional GDPR Art.9 categories — server blocks if user withdrew consent
        if (Array.isArray(normalized.gdpr_categories) && normalized.gdpr_categories.length > 0) {
          requestBody.gdpr_categories = normalized.gdpr_categories
        }

        console.log('🤖 InvokeLLM:', requestBody)

        try {
          const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
          const response = await fetch(`${apiBase}/api/vagus-planner/llm`, {
            method: 'POST',
            headers: await getVpApiFetchHeaders(),
            credentials: 'include',
            body: JSON.stringify(requestBody),
          })

          const data = await response.json()

          if (!response.ok) {
            const message =
              typeof data?.error === 'string' ? data.error : 'InvokeLLM request failed'
            throw new Error(message)
          }

          // Plain-text callers (tafsir, chat bubbles) expect a string, not { text }.
          if (
            !requestBody.response_json_schema &&
            data &&
            typeof data === 'object' &&
            typeof data.text === 'string' &&
            Object.keys(data).length === 1
          ) {
            return data.text
          }

          return data
        } catch (error) {
          console.error('❌ Error in InvokeLLM:', error)
          throw error
        }
      },
      UploadFile: async (input) => {
        const file =
          input instanceof Blob || input instanceof File
            ? input
            : input && typeof input === 'object' && input.file instanceof Blob
              ? input.file
              : null
        if (!file) {
          throw new Error('UploadFile requires a File or Blob')
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.id) {
          throw new Error('Must be signed in to upload files')
        }

        const name =
          file.name ||
          (file.type?.includes('mp4') ? `audio_${Date.now()}.m4a` : `audio_${Date.now()}.webm`)

        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${user.id}/files/${Date.now()}_${safeName}`

        const { data, error } = await supabase.storage.from('uploads').upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        })
        if (error) throw error

        // Private bucket — signed URL only (1h window for server transcription download)
        const { data: signed, error: signError } = await supabase.storage
          .from('uploads')
          .createSignedUrl(data.path, 3600)
        if (signError) throw signError

        const file_url = signed?.signedUrl ?? null
        if (!file_url) {
          throw new Error('Could not create signed URL for uploaded file')
        }

        return { ...data, file_url, storage_path: data.path }
      },
      SendEmail: async (params, subjectArg, bodyArg) => {
        const normalized =
          typeof params === 'string'
            ? { to: params, subject: subjectArg, body: bodyArg }
            : params && typeof params === 'object'
              ? params
              : {}

        const to = typeof normalized.to === 'string' ? normalized.to.trim() : ''
        const subject = typeof normalized.subject === 'string' ? normalized.subject.trim() : ''
        const body = typeof normalized.body === 'string' ? normalized.body : ''
        const replyTo =
          typeof normalized.replyTo === 'string' ? normalized.replyTo.trim() : undefined

        console.log('📧 SendEmail:', { to, subject })

        try {
          const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
          const response = await fetch(`${apiBase}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ to, subject, body, replyTo }),
          })

          const data = await response.json()

          if (!response.ok) {
            const message =
              typeof data?.error === 'string' ? data.error : 'SendEmail request failed'
            throw new Error(message)
          }

          return data
        } catch (error) {
          console.error('❌ Error sending email:', error)
          throw error
        }
      }
    }
  },

  // =============================================
  // Storage
  // =============================================
  
  storage: {
    from: (bucket) => supabase.storage.from(bucket)
  },

  // =============================================
  // Logs
  // =============================================
  
  appLogs: {
    info: (message) => console.log('📋 INFO:', message),
    warn: (message) => console.warn('📋 WARN:', message),
    error: (message) => console.error('📋 ERROR:', message)
  },

  // =============================================
  // Realtime
  // =============================================
  
  realtime: {
    subscribe: (channel, callback) => {
      const subscription = supabase
        .channel(channel)
        .on('*', (payload) => callback(payload))
        .subscribe()
      return subscription
    }
  }
}

// =============================================
// Axios Client Stub (for legacy code)
// =============================================

export const createAxiosClient = (config = {}) => {
  return {
    get: async (url) => {
      console.log(`📡 GET ${url}`)
      try {
        const response = await fetch(url)
        return { data: await response.json() }
      } catch {
        return { data: {} }
      }
    },
    post: async (url, data) => {
      console.log(`📡 POST ${url}`, data)
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return { data: await response.json() }
      } catch {
        return { data: {} }
      }
    },
    put: async (url, data) => {
      console.log(`📡 PUT ${url}`, data)
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return { data: await response.json() }
      } catch {
        return { data: {} }
      }
    },
    delete: async (url) => {
      console.log(`📡 DELETE ${url}`)
      try {
        const response = await fetch(url, { method: 'DELETE' })
        return { data: await response.json() }
      } catch {
        return { data: {} }
      }
    }
  }
}

// =============================================
// Export as default for compatibility
// =============================================

export default base44

// Also export as SDK for new code
export const SDK = base44
