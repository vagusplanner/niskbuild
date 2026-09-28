import { NS_SCHEMA, supabase } from '@/lib/supabase'

const ONBOARDING_FLAT_KEYS = [
  'preferred_name',
  'onboarding_role',
  'onboarding_industry',
  'onboarding_challenge',
  'onboarding_goal',
  'onboarding_experience',
  'onboarding_urgency',
  'onboarding_budget',
]

function nsTable(name) {
  return supabase.schema(NS_SCHEMA).from(name)
}

/**
 * Flatten auth.users + ns_user_settings into a Base44-like user object
 * so existing pages (Dashboard, Onboarding, ClientPortal) keep working.
 */
export function mapNsUser(authUser, settings) {
  if (!authUser) return null
  const onboarding = settings?.onboarding && typeof settings.onboarding === 'object'
    ? settings.onboarding
    : {}
  return {
    id: authUser.id,
    email: authUser.email ?? null,
    created_at: authUser.created_at ?? null,
    onboarding_completed: settings?.onboarding_completed ?? false,
    recommended_tier: settings?.recommended_tier ?? null,
    locale: settings?.locale ?? null,
    timezone: settings?.timezone ?? null,
    onboarding,
    preferred_name: onboarding.preferred_name ?? null,
    onboarding_role: onboarding.onboarding_role ?? null,
    onboarding_industry: onboarding.onboarding_industry ?? null,
    onboarding_challenge: onboarding.onboarding_challenge ?? null,
    onboarding_goal: onboarding.onboarding_goal ?? null,
    onboarding_experience: onboarding.onboarding_experience ?? null,
    onboarding_urgency: onboarding.onboarding_urgency ?? null,
    onboarding_budget: onboarding.onboarding_budget ?? null,
    _settings: settings ?? null,
  }
}

export async function fetchNsUserSettings(userId) {
  const { data, error } = await nsTable('ns_user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Create a default settings row if missing (idempotent). */
export async function ensureNsUserSettings(userId) {
  const existing = await fetchNsUserSettings(userId)
  if (existing) return existing

  const { data, error } = await nsTable('ns_user_settings')
    .upsert(
      {
        user_id: userId,
        onboarding_completed: false,
        onboarding: {},
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function getNsMe() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) return null
  const settings = await ensureNsUserSettings(user.id)
  return mapNsUser(user, settings)
}

export async function updateNsMe(updates = {}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Not authenticated')

  const current = await ensureNsUserSettings(user.id)
  const nextOnboarding = {
    ...(current.onboarding && typeof current.onboarding === 'object' ? current.onboarding : {}),
  }

  for (const key of ONBOARDING_FLAT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      nextOnboarding[key] = updates[key]
    }
  }
  if (updates.onboarding && typeof updates.onboarding === 'object') {
    Object.assign(nextOnboarding, updates.onboarding)
  }

  const patch = {
    user_id: user.id,
    onboarding: nextOnboarding,
    updated_at: new Date().toISOString(),
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'onboarding_completed')) {
    patch.onboarding_completed = !!updates.onboarding_completed
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'recommended_tier')) {
    patch.recommended_tier = updates.recommended_tier
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'locale')) {
    patch.locale = updates.locale
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'timezone')) {
    patch.timezone = updates.timezone
  }

  const { data, error } = await nsTable('ns_user_settings')
    .upsert(patch, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error) throw error
  return mapNsUser(user, data)
}

export async function nsIsAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session?.user
}

export async function nsLogout(redirectTo) {
  await supabase.auth.signOut()
  if (typeof window !== 'undefined' && redirectTo) {
    window.location.href = redirectTo
  }
}

export function nsRedirectToLogin(fromUrl) {
  if (typeof window === 'undefined') return
  const next = fromUrl || `${window.location.pathname}${window.location.search}`
  const params = new URLSearchParams()
  if (next && next !== '/login') params.set('next', next)
  const qs = params.toString()
  window.location.href = qs ? `/login?${qs}` : '/login'
}
