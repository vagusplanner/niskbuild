// =============================================
// Base44 Compatibility Layer for Vagus Planner
// Maps Base44 SDK calls to Supabase
// =============================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

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
  Event: { start_date: 'date' },
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
    onAuthStateChange: (callback) => {
      return supabase.auth.onAuthStateChange(callback)
    },
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    isAuthenticated: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return !!user
    },
    redirectToLogin: () => {
      window.location.href = '/login'
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
          return data ?? []
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
          return data ?? []
        },
        get: async (id) => {
          const { data, error } = await tableFrom(tableName)
            .select('*')
            .eq('id', id)
            .single()
          if (error) throw error
          return data
        },
        create: async (payload) => {
          const { data, error } = await tableFrom(tableName)
            .insert([payload])
            .select()
          if (error) throw error
          return data[0]
        },
        update: async (id, payload) => {
          const { data, error } = await tableFrom(tableName)
            .update(payload)
            .eq('id', id)
            .select()
          if (error) throw error
          return data[0]
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
        const response = await fetch('/api/ai-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ function: name, payload })
        })
        return await response.json()
      } catch (error) {
        console.error('❌ Error invoking function:', error)
        return { error: error.message }
      }
    }
  },

  // =============================================
  // Integrations
  // =============================================
  
  integrations: {
    Core: {
      InvokeLLM: async (prompt) => {
        console.log('🤖 InvokeLLM:', prompt)
        try {
          const response = await fetch('/api/ai-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              function: 'InvokeLLM', 
              payload: { prompt } 
            })
          })
          return await response.json()
        } catch (error) {
          console.error('❌ Error in InvokeLLM:', error)
          return { error: error.message }
        }
      },
      UploadFile: async (file) => {
        console.log('📤 UploadFile:', file.name)
        const { data, error } = await supabase
          .storage
          .from('uploads')
          .upload(`files/${Date.now()}_${file.name}`, file)
        if (error) throw error
        return data
      },
      SendEmail: async (to, subject, body) => {
        console.log('📧 SendEmail:', { to, subject })
        try {
          const response = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, body })
          })
          return await response.json()
        } catch (error) {
          console.error('❌ Error sending email:', error)
          return { error: error.message }
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
