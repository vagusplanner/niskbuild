// =============================================
// Base44 Compatibility Layer for Vagus Planner
// Maps Base44 SDK calls to Supabase
// =============================================

import { createClient } from '@supabase/supabase-js'
import { redirectToVpLogin, redirectToVpSignup } from './static-bundle'
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
  Hadith: 'vp_saved_hadiths',
  EventEdit: 'vp_event_edits',
  EventComment: 'vp_comments',
  Comment: 'vp_comments',
  SharedFile: 'vp_shared_files',
  EventLock: 'vp_event_locks',
  SyncState: 'vp_sync_states',
  TaskShare: 'vp_task_shares',
  Reminder: 'vp_reminders',
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
  Event: { start_date: 'event_date', created_by: '__skip__' },
  Task: { description: 'description' },
  Holiday: { start_date: 'holiday_date', title: 'name', created_by: '__skip__' },
  Expense: { created_by: '__skip__' },
  PrayerLog: { date: 'prayed_at' },
  Goal: { due_date: 'target_date' },
  IslamicEvent: { date: 'gregorian_date' },
  NotificationPreference: { user_email: '__skip__' },
}

const NOTIFICATION_PREFERENCE_METADATA_KEYS = new Set([
  'billing_emails',
  'renewal_reminders',
  'payment_alerts',
  'upgrade_confirmations',
])

/** Production vp_tasks.priority is text ("low"|"medium"|"high"|"urgent"). */
const TASK_PRIORITY_LABELS = new Set(['low', 'medium', 'high', 'urgent'])
const TASK_PRIORITY_FROM_NUMBER = { 0: 'low', 1: 'low', 2: 'medium', 3: 'high' }
const TASK_STATUS_MAP = {
  todo: 'pending',
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  done: 'completed',
  cancelled: 'cancelled',
  not_started: 'pending',
}

function mapTaskPriority(value) {
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    if (TASK_PRIORITY_LABELS.has(lower)) return lower
    // Legacy numeric strings
    const asNum = Number(lower)
    if (!Number.isNaN(asNum) && TASK_PRIORITY_FROM_NUMBER[asNum] != null) {
      return TASK_PRIORITY_FROM_NUMBER[asNum]
    }
    return 'medium'
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return TASK_PRIORITY_FROM_NUMBER[Math.min(3, Math.max(0, value))] ?? 'medium'
  }
  return 'medium'
}

function mapTaskStatus(value) {
  if (typeof value === 'string') return TASK_STATUS_MAP[value.toLowerCase()] ?? 'pending'
  return 'pending'
}

function asJsonArray(value) {
  if (Array.isArray(value)) return value
  return null
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
    // Production has `description` (not legacy `notes`-only). Persist both when present.
    if (p.description != null) {
      const desc = String(p.description).trim()
      if (desc) row.description = desc
    }
    if (p.notes != null) {
      const notes = String(p.notes).trim()
      if (notes) row.notes = notes
    }
    if (p.due_date != null && p.due_date !== '') {
      const due = new Date(p.due_date)
      if (!Number.isNaN(due.getTime())) row.due_date = due.toISOString()
    }
    if (p.due_time != null && String(p.due_time).trim()) {
      row.due_time = String(p.due_time).trim()
    }
    if (p.priority != null) row.priority = mapTaskPriority(p.priority)
    if (p.status != null) row.status = mapTaskStatus(p.status)
    else if (userId && row.title) row.status = 'pending'
    if (p.category != null && String(p.category).trim()) {
      row.category = String(p.category).trim().toLowerCase()
    }
    if (p.estimated_minutes != null && p.estimated_minutes !== '') {
      const mins = Number(p.estimated_minutes)
      if (Number.isFinite(mins) && mins > 0) row.estimated_minutes = Math.round(mins)
    }
    // NOT NULL jsonb columns: always set defaults on create so multi-row
    // bulkCreate inserts don't send null for omitted keys (PostgREST coalesces
    // batch keys and skips DB defaults).
    const subtasks = asJsonArray(p.subtasks)
    if (subtasks) row.subtasks = subtasks
    else if (userId) row.subtasks = []
    const tags = asJsonArray(p.tags)
    if (tags) row.tags = tags
    else if (userId) row.tags = []
    const dependencies = asJsonArray(p.dependencies)
    if (dependencies) row.dependencies = dependencies
    else if (userId) row.dependencies = []
    if (p.event_id != null && p.event_id !== '') row.event_id = p.event_id
    if (p.assigned_to != null) row.assigned_to = p.assigned_to
    if (p.assigned_by != null) row.assigned_by = p.assigned_by
    return row
  }

  if (entityName === 'Reminder') {
    const row = {}
    if (userId) row.user_id = userId
    if (p.title != null && String(p.title).trim()) row.title = String(p.title).trim()
    else if (userId) row.title = 'Reminder'
    const body = p.body ?? p.description
    if (body != null && String(body).trim()) row.body = String(body).trim()
    else if (userId) row.body = row.title
    const reminderType = p.reminder_type ?? p.reminderType ?? 'event'
    const allowed = new Set(['general', 'prayer', 'task_due', 'event', 'journal'])
    row.reminder_type = allowed.has(String(reminderType)) ? String(reminderType) : 'event'
    const scheduled = p.scheduled_at ?? p.scheduledAt
    if (scheduled != null && scheduled !== '') {
      const d = new Date(scheduled)
      if (!Number.isNaN(d.getTime())) row.scheduled_at = d.toISOString()
    }
    if (p.channel != null) row.channel = p.channel
    if (p.metadata != null && typeof p.metadata === 'object') row.metadata = p.metadata
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
      not_started: 'active',
      in_progress: 'active',
      on_hold: 'active',
      active: 'active',
      completed: 'completed',
      archived: 'archived',
    }
    const row = { title: p.title ?? 'Goal' }
    if (userId) row.user_id = userId
    if (p.description != null) row.description = p.description
    // Empty string is invalid for timestamptz — omit rather than send "".
    const rawTarget = p.target_date ?? p.due_date ?? p.deadline
    if (rawTarget != null && String(rawTarget).trim() !== '') {
      row.target_date = rawTarget
    }
    if (p.status != null) row.status = statusMap[p.status] ?? 'active'
    const progress = p.progress ?? p.progress_percentage
    if (progress != null && progress !== '') {
      const n = Number(progress)
      if (Number.isFinite(n)) row.progress = Math.min(100, Math.max(0, n))
    }
    if (p.priority != null && p.priority !== '') row.priority = p.priority
    if (p.category != null && p.category !== '') row.category = p.category
    if (p.motivation != null) row.motivation = p.motivation
    if (p.obstacles != null) row.obstacles = p.obstacles
    if (p.notes != null) row.notes = p.notes
    if (Array.isArray(p.tags)) row.tags = p.tags
    if (Array.isArray(p.resources_needed)) row.resources_needed = p.resources_needed
    if (Array.isArray(p.action_steps)) row.action_steps = p.action_steps
    row.updated_at = new Date().toISOString()
    return row
  }

  if (entityName === 'NotificationPreference') {
    return mapNotificationPreferencePayloadToRow(p, null, userId)
  }

  if (entityName === 'Hadith') {
    const english =
      p.english_translation ?? p.translation ?? p.english ?? p.text ?? ''
    const row = {
      english_translation: typeof english === 'string' ? english : String(english ?? ''),
    }
    if (userId) row.user_id = userId
    const arabic = p.arabic_text ?? p.arabic
    if (arabic != null) row.arabic_text = arabic
    if (p.narrator != null) row.narrator = p.narrator
    if (p.source != null) row.source = p.source
    if (p.reference != null) row.reference = p.reference
    if (p.collection != null) row.collection = p.collection
    else if (p.source != null && !p.collection) row.collection = p.source
    if (p.category != null) row.category = p.category
    if (p.grade != null) row.grade = p.grade
    if (p.title != null) row.title = p.title
    if (p.notes != null) row.notes = typeof p.notes === 'string' ? p.notes : JSON.stringify(p.notes)
    if (p.hadith_number != null || p.hadithNumber != null) {
      const n = Number(p.hadith_number ?? p.hadithNumber)
      if (Number.isFinite(n)) row.hadith_number = n
    }
    if (p.is_favorite != null) row.is_favorite = p.is_favorite !== false
    else row.is_favorite = true
    if (p.ai_context != null) {
      row.ai_context =
        typeof p.ai_context === 'object' && !Array.isArray(p.ai_context)
          ? p.ai_context
          : { value: p.ai_context }
    }
    row.updated_at = new Date().toISOString()
    return row
  }

  if (entityName === 'EventEdit') {
    const row = {}
    if (userId) row.user_id = userId
    if (p.event_id != null) row.event_id = p.event_id
    row.kind = p.kind === 'history' ? 'history' : 'presence'
    if (p.editor_email != null) row.editor_email = p.editor_email
    if (p.editor_name != null) row.editor_name = p.editor_name
    if (p.field != null) row.field = p.field
    if (p.color != null) row.color = p.color
    if (p.cursor_position != null) row.cursor_position = p.cursor_position
    if (p.selection_start != null) row.selection_start = p.selection_start
    if (p.selection_end != null) row.selection_end = p.selection_end
    row.last_active = p.last_active ?? new Date().toISOString()
    if (p.previous_value != null) row.previous_value = String(p.previous_value)
    if (p.new_value != null) row.new_value = String(p.new_value)
    row.updated_at = new Date().toISOString()
    return row
  }

  if (entityName === 'Comment' || entityName === 'EventComment') {
    const entityType =
      p.entity_type ??
      p.context_type ??
      (entityName === 'EventComment' || p.event_id ? 'event' : 'event')
    const entityId = p.entity_id ?? p.context_id ?? p.event_id
    const content = p.content ?? p.message ?? ''
    const row = {
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : '',
      content,
      author_email: p.author_email ?? p.user_email ?? null,
      author_name: p.author_name ?? p.user_name ?? null,
    }
    if (userId) row.user_id = userId
    row.updated_at = new Date().toISOString()
    return row
  }

  if (entityName === 'SharedFile') {
    const row = {
      file_name: p.file_name ?? p.name ?? 'file',
      storage_provider: p.storage_provider ?? 'supabase',
    }
    if (userId) row.user_id = userId
    if (p.event_id != null || p.shared_in_event != null) {
      row.event_id = p.event_id ?? p.shared_in_event
    }
    if (p.chat_id != null) row.chat_id = p.chat_id
    if (p.file_type != null) row.file_type = p.file_type
    if (p.file_size != null) row.file_size = p.file_size
    if (p.storage_path != null) row.storage_path = p.storage_path
    if (p.file_url != null) row.file_url = p.file_url
    row.updated_at = new Date().toISOString()
    return row
  }

  if (entityName === 'EventLock') {
    const row = {}
    if (userId) row.user_id = userId
    if (p.event_id != null) row.event_id = p.event_id
    if (p.locked_by != null) row.locked_by = p.locked_by
    row.last_active = p.last_active ?? new Date().toISOString()
    row.updated_at = new Date().toISOString()
    return row
  }

  if (entityName === 'SyncState') {
    const row = { service: p.service ?? 'googlecalendar' }
    if (userId) row.user_id = userId
    if (p.status != null) row.status = p.status
    if (p.last_synced_at != null) row.last_synced_at = p.last_synced_at
    if (p.last_attempted_at != null) row.last_attempted_at = p.last_attempted_at
    if (p.last_error != null) row.last_error = p.last_error
    if (p.sync_token != null) row.sync_token = p.sync_token
    if (p.metadata != null) row.metadata = p.metadata
    row.updated_at = new Date().toISOString()
    return row
  }

  if (entityName === 'TaskShare') {
    const row = {
      shared_with_email: p.shared_with_email ?? p.shared_with,
      permission: p.permission === 'edit' ? 'edit' : 'view',
      status: p.status ?? 'pending',
    }
    if (userId) row.user_id = userId
    if (p.task_id != null) row.task_id = p.task_id
    if (p.shared_by != null || p.shared_by_email != null) {
      row.shared_by_email = p.shared_by_email ?? p.shared_by
    }
    row.updated_at = new Date().toISOString()
    return row
  }

  if (entityName === 'SharedCalendar') {
    const row = {
      owner_email: p.owner_email,
      shared_with_email: (p.shared_with_email ?? '').toLowerCase().trim(),
      permission: ['view', 'edit', 'invite'].includes(p.permission) ? p.permission : 'view',
      notify_on_changes: p.notify_on_changes !== false,
      calendar_type: p.calendar_type === 'group' ? 'group' : 'personal',
    }
    if (userId) row.user_id = userId
    if (p.group_calendar_id != null) row.group_calendar_id = p.group_calendar_id
    row.updated_at = new Date().toISOString()
    return row
  }

  if (entityName === 'Notification') {
    const row = {
      recipient_email: (p.recipient_email ?? p.user_email ?? '').toLowerCase().trim(),
      type: p.type ?? 'general',
      title: p.title ?? 'Notification',
      message: p.message ?? null,
      priority: p.priority ?? 'medium',
      is_read: p.is_read === true,
      dismissed: p.dismissed === true,
    }
    if (userId) row.user_id = userId
    if (p.icon != null) row.icon = p.icon
    if (p.entity_type != null) row.entity_type = p.entity_type
    if (p.entity_id != null) row.entity_id = String(p.entity_id)
    if (p.scheduled_for != null) row.scheduled_for = p.scheduled_for
    if (p.metadata != null) row.metadata = p.metadata
    else if (p.action_url != null) row.metadata = { action_url: p.action_url }
    row.updated_at = new Date().toISOString()
    return row
  }

  const row = { ...p }
  if (userId && row.user_id == null) row.user_id = userId
  return row
}

function mapNotificationPreferencePayloadToRow(payload, existingRow, userId) {
  const p = payload ?? {}
  const metadata = {
    ...(existingRow?.metadata && typeof existingRow.metadata === 'object'
      ? existingRow.metadata
      : {}),
  }
  for (const key of NOTIFICATION_PREFERENCE_METADATA_KEYS) {
    if (key in p) metadata[key] = p[key]
  }

  const row = {}
  if (userId) row.user_id = userId
  if (p.notification_type != null) row.notification_type = p.notification_type
  if (p.enabled != null) row.enabled = p.enabled !== false
  else if (p.billing_emails != null) row.enabled = p.billing_emails !== false
  if (p.priority != null) row.priority = p.priority
  if (p.advance_notice_minutes != null) {
    row.advance_notice_minutes = p.advance_notice_minutes
  }
  if (p.channels != null) row.channels = p.channels
  if (Object.keys(metadata).length > 0) row.metadata = metadata
  row.updated_at = new Date().toISOString()
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
    return {
      ...row,
      description: row.description ?? row.notes ?? '',
      notes: row.notes ?? '',
      category: row.category ?? 'personal',
      estimated_minutes: row.estimated_minutes ?? null,
      due_time: row.due_time ?? '',
      subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      dependencies: Array.isArray(row.dependencies) ? row.dependencies : [],
      event_id: row.event_id ?? null,
      status: row.status === 'pending' ? 'todo' : row.status,
      priority: mapTaskPriority(row.priority),
    }
  }

  if (entityName === 'Reminder') {
    return {
      ...row,
      description: row.body ?? row.description,
      scheduledAt: row.scheduled_at,
      reminderType: row.reminder_type,
    }
  }

  if (entityName === 'Holiday') {
    return {
      ...row,
      title: row.name ?? row.title,
      start_date: row.holiday_date ?? row.start_date,
      status: row.status ?? 'planned',
      created_by: row.created_by_email ?? row.created_by,
    }
  }

  if (entityName === 'Goal' || entityName === 'LifeGoal') {
    const progress = typeof row.progress === 'number' ? row.progress : 0
    let status = row.status
    if (status === 'active') {
      status = progress > 0 ? 'in_progress' : 'not_started'
    }
    return {
      ...row,
      status,
      priority: row.priority ?? 'medium',
      category: row.category ?? 'personal',
      progress,
      progress_percentage: progress,
      due_date: row.target_date ?? row.due_date,
      tags: Array.isArray(row.tags) ? row.tags : [],
      resources_needed: Array.isArray(row.resources_needed) ? row.resources_needed : [],
      action_steps: Array.isArray(row.action_steps) ? row.action_steps : [],
      created_date: row.created_at ?? row.created_date,
      updated_date: row.updated_at ?? row.updated_date,
    }
  }

  if (entityName === 'PrayerLog') {
    const prayedAt = row.prayed_at ?? row.date
    return {
      ...row,
      date: prayedAt,
      prayed_at: prayedAt,
      created_date: row.created_at ?? row.created_date,
    }
  }

  if (entityName === 'IslamicEvent') {
    return {
      ...row,
      date: row.gregorian_date ?? row.date,
      created_date: row.created_at ?? row.created_date,
      updated_date: row.updated_at ?? row.updated_date,
    }
  }

  if (entityName === 'Habit') {
    return {
      ...row,
      completion_dates: Array.isArray(row.completion_dates) ? row.completion_dates : [],
      created_date: row.created_at ?? row.created_date,
      updated_date: row.updated_at ?? row.updated_date,
    }
  }

  if (entityName === 'NotificationPreference') {
    const metadata =
      row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
    return {
      ...row,
      ...metadata,
      channels: Array.isArray(row.channels) ? row.channels : [],
      created_date: row.created_at ?? row.created_date,
      updated_date: row.updated_at ?? row.updated_date,
    }
  }

  if (entityName === 'Hadith') {
    return {
      ...row,
      english_translation: row.english_translation ?? row.translation ?? '',
      arabic_text: row.arabic_text ?? row.arabic ?? '',
      created_date: row.created_at ?? row.created_date,
      updated_date: row.updated_at ?? row.updated_date,
      hadithNumber: row.hadith_number ?? row.hadithNumber ?? null,
      is_favorite: row.is_favorite !== false,
    }
  }

  if (entityName === 'Comment' || entityName === 'EventComment') {
    const content = row.content ?? row.message ?? ''
    return {
      ...row,
      content,
      message: row.message ?? content,
      author_email: row.author_email,
      author_name: row.author_name,
      user_email: row.user_email ?? row.author_email,
      user_name: row.user_name ?? row.author_name,
      event_id: row.event_id ?? (row.entity_type === 'event' ? row.entity_id : null),
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      context_type: row.context_type ?? row.entity_type,
      context_id: row.context_id ?? row.entity_id,
      created_date: row.created_at ?? row.created_date,
      updated_date: row.updated_at ?? row.updated_date,
    }
  }

  if (entityName === 'SharedFile') {
    return {
      ...row,
      shared_in_event: row.shared_in_event ?? row.event_id,
      created_date: row.created_at ?? row.created_date,
      updated_date: row.updated_at ?? row.updated_date,
    }
  }

  if (entityName === 'TaskShare') {
    return {
      ...row,
      shared_with: row.shared_with ?? row.shared_with_email,
      shared_by: row.shared_by ?? row.shared_by_email,
      created_date: row.created_at ?? row.created_date,
      updated_date: row.updated_at ?? row.updated_date,
    }
  }

  if (entityName === 'EventEdit' || entityName === 'EventLock' || entityName === 'SyncState') {
    return {
      ...row,
      created_date: row.created_at ?? row.created_date,
      updated_date: row.updated_at ?? row.updated_date,
    }
  }

  return {
    ...row,
    created_date: row.created_at ?? row.created_date,
    updated_date: row.updated_at ?? row.updated_date,
  }
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
  let column = mapColumn(parsed.column, entityName)
  if (column === '__skip__') return query
  if (entityName === 'Goal' && column === 'priority') {
    column = 'target_date'
  }
  if (entityName === 'Task' && column === 'priority') {
    column = 'priority'
  }
  return query.order(column, { ascending: parsed.ascending, nullsFirst: false })
}

function mapGoalStatusValue(value) {
  const map = {
    not_started: 'active',
    in_progress: 'active',
    active: 'active',
    completed: 'completed',
    archived: 'archived',
  }
  if (typeof value === 'string') return map[value] ?? value
  return value
}

function mapTaskStatusFilterValue(value) {
  const map = {
    todo: 'pending',
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
    blocked: 'pending',
  }
  if (typeof value === 'string') return map[value] ?? value
  return value
}

function applyFilters(query, criteria, entityName) {
  let next = query
  for (const [key, value] of Object.entries(criteria ?? {})) {
    if (entityName === 'EventComment' && key === 'event_id') {
      next = next.eq('entity_type', 'event').eq('entity_id', String(value))
      continue
    }
    if (entityName === 'Comment' && key === 'context_id') {
      next = next.eq('entity_id', String(value))
      continue
    }
    if (entityName === 'Comment' && key === 'context_type') {
      next = next.eq('entity_type', value)
      continue
    }
    if (entityName === 'SharedFile' && key === 'shared_in_event') {
      next = next.eq('event_id', value)
      continue
    }
    if (entityName === 'TaskShare' && (key === 'shared_with' || key === 'shared_by')) {
      next = next.eq(key === 'shared_with' ? 'shared_with_email' : 'shared_by_email', value)
      continue
    }
    if (entityName === 'PrayerLog' && key === 'date') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const col = 'prayed_at'
        if (value.$gte != null) next = next.gte(col, value.$gte)
        if (value.$lte != null) next = next.lte(col, value.$lte)
        continue
      }
      if (typeof value === 'string') {
        const day = value.split('T')[0]
        next = next.gte('prayed_at', `${day}T00:00:00`).lt('prayed_at', `${day}T23:59:59.999`)
        continue
      }
    }
    const mappedCol = mapColumn(key, entityName)
    if (mappedCol === '__skip__') {
      continue
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const col = mappedCol
      if (value.$gte != null) next = next.gte(col, value.$gte)
      if (value.$lte != null) next = next.lte(col, value.$lte)
      if (value.$gt != null) next = next.gt(col, value.$gt)
      if (value.$lt != null) next = next.lt(col, value.$lt)
      if (value.$ne != null) next = next.neq(col, value.$ne)
      if (value.$regex != null) {
        next = next.ilike(col, `%${String(value.$regex).replace(/%/g, '')}%`)
        continue
      }
      if (value.$in != null) {
        let values = value.$in
        if (entityName === 'Goal' && key === 'status') {
          values = [...new Set(values.map(mapGoalStatusValue))]
        }
        if (entityName === 'Task' && key === 'status') {
          values = [...new Set(values.map(mapTaskStatusFilterValue))]
        }
        next = next.in(col, values)
      }
      continue
    }
    if (entityName === 'Goal' && key === 'status') {
      next = next.eq(mappedCol, mapGoalStatusValue(value))
      continue
    }
    if (entityName === 'Task' && key === 'status') {
      next = next.eq(mappedCol, mapTaskStatusFilterValue(value))
      continue
    }
    next = next.eq(mappedCol, value)
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
    bulkCreate: async () => [],
    update: async () => null,
    delete: async () => null,
    filter: async () => [],
    subscribe: () => () => {},
  }
}

function subscribeEntity(tableName, entityName, callback) {
  const channel = supabase
    .channel(`vp_${tableName}_${entityName}_${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: FIRSTPARTY_SCHEMA, table: tableName },
      (payload) => {
        const eventType = payload.eventType
        const type =
          eventType === 'INSERT' ? 'create' : eventType === 'UPDATE' ? 'update' : 'delete'
        const raw = payload.new && Object.keys(payload.new).length ? payload.new : payload.old
        callback({
          type,
          id: raw?.id,
          data: mapRowFromDb(entityName, raw),
        })
      }
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

async function listDirectoryUsers(criteria = {}) {
  const { data, error } = await supabase.rpc('vp_list_directory_users')
  let users = []
  if (!error && Array.isArray(data)) {
    users = data
  } else if (!error && typeof data === 'string') {
    try {
      users = JSON.parse(data)
    } catch {
      users = []
    }
  } else {
    const { data: auth } = await supabase.auth.getUser()
    const me = mapSupabaseUserToVpUser(auth?.user)
    users = me ? [me] : []
  }

  if (criteria && typeof criteria === 'object') {
    for (const [key, value] of Object.entries(criteria)) {
      users = users.filter((u) => u?.[key] === value)
    }
  }
  return users
}

function createUserEntityApi() {
  return {
    list: async () => listDirectoryUsers(),
    filter: async (criteria = {}) => listDirectoryUsers(criteria),
    get: async (id) => {
      const users = await listDirectoryUsers()
      return users.find((u) => u.id === id) ?? null
    },
    create: async () => {
      throw new Error('entities.User is a directory lookup, not a CRUD entity')
    },
    update: async () => {
      throw new Error('entities.User is a directory lookup, not a CRUD entity')
    },
    delete: async () => {
      throw new Error('entities.User is a directory lookup, not a CRUD entity')
    },
    subscribe: () => () => {},
  }
}

async function insertOrUpdateRow(tableName, entityName, payload) {
  const userId = await getCurrentUserId()
  const row = mapPayloadToRow(entityName, payload, userId)

  if (entityName === 'EventEdit' && row.kind === 'presence' && row.event_id && row.editor_email && row.field) {
    const { data: existing } = await tableFrom(tableName)
      .select('*')
      .eq('event_id', row.event_id)
      .eq('editor_email', row.editor_email)
      .eq('field', row.field)
      .eq('kind', 'presence')
      .limit(1)
    if (existing?.[0]) {
      const { data, error } = await tableFrom(tableName)
        .update(row)
        .eq('id', existing[0].id)
        .select()
      if (error) throw error
      return mapRowFromDb(entityName, data[0])
    }
  }

  if (entityName === 'EventLock' && row.event_id && userId) {
    const { data: existing } = await tableFrom(tableName)
      .select('*')
      .eq('event_id', row.event_id)
      .limit(1)
    if (existing?.[0]) {
      const last = new Date(existing[0].last_active || existing[0].created_at).getTime()
      const stale = Date.now() - last > 90_000
      if (existing[0].user_id === userId || stale) {
        const { data, error } = await tableFrom(tableName)
          .update({ ...row, user_id: userId })
          .eq('id', existing[0].id)
          .select()
        if (error) throw error
        return mapRowFromDb(entityName, data[0])
      }
      return mapRowFromDb(entityName, existing[0])
    }
  }

  if (entityName === 'SyncState' && row.service && userId) {
    const { data: existing } = await tableFrom(tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('service', row.service)
      .limit(1)
    if (existing?.[0]) {
      const { data, error } = await tableFrom(tableName)
        .update(row)
        .eq('id', existing[0].id)
        .select()
      if (error) throw error
      return mapRowFromDb(entityName, data[0])
    }
  }

  const { data, error } = await tableFrom(tableName).insert(row).select()
  if (error) throw error
  return mapRowFromDb(entityName, data[0])
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
    redirectToSignup: (nextPath) => {
      redirectToVpSignup(typeof nextPath === 'string' ? nextPath : '/dashboard')
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
      if (entityName === 'User') {
        return createUserEntityApi()
      }

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
          if (
            entityName === 'EventEdit' ||
            entityName === 'EventLock' ||
            entityName === 'SyncState'
          ) {
            return insertOrUpdateRow(tableName, entityName, payload)
          }
          const userId = await getCurrentUserId()
          let row
          if (entityName === 'UserSettings') {
            row = mapUserSettingsPayloadToRow(payload, null, userId)
          } else {
            row = mapPayloadToRow(entityName, payload, userId)
          }
          const { data, error } = await tableFrom(tableName)
            .insert(row)
            .select()
          if (error) throw error
          return mapRowFromDb(entityName, data[0])
        },
        bulkCreate: async (payloads) => {
          if (!Array.isArray(payloads) || payloads.length === 0) return []
          const userId = await getCurrentUserId()
          const rows = payloads.map((payload) => {
            if (entityName === 'UserSettings') {
              return mapUserSettingsPayloadToRow(payload, null, userId)
            }
            return mapPayloadToRow(entityName, payload, userId)
          })
          const { data, error } = await tableFrom(tableName).insert(rows).select()
          if (error) throw error
          return (data ?? []).map((row) => mapRowFromDb(entityName, row))
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
          } else if (entityName === 'NotificationPreference') {
            const { data: existing, error: readError } = await tableFrom(tableName)
              .select('*')
              .eq('id', id)
              .single()
            if (readError) throw readError
            row = mapNotificationPreferencePayloadToRow(payload, existing, null)
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
        subscribe: (callback) => subscribeEntity(tableName, entityName, callback),
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
        const message = error instanceof Error ? error.message : String(error)
        if (!/not implemented/i.test(message)) {
          console.error('❌ Error invoking function:', error)
        }
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
