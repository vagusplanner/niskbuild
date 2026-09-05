import { supabase } from './supabase'

/** API host for cross-origin / Capacitor. Empty ⇒ same-origin (Vite proxy in local web). */
export function getShiftAiApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
}

/** Bearer token headers — mirrors VP getVpApiFetchHeaders. */
export async function getShiftAiApiFetchHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch {
    // Session may be absent on public routes.
  }
  return headers
}

export async function shiftAiFetch(path, options = {}) {
  const base = getShiftAiApiBaseUrl()
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = {
    ...(await getShiftAiApiFetchHeaders()),
    ...(options.headers || {}),
  }
  return fetch(url, {
    ...options,
    headers,
  })
}
