import { supabase } from '@/lib/supabase'

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
}

/** Bearer token for cross-origin NS API calls. */
export async function getNsApiFetchHeaders(extra = {}) {
  const headers = { ...extra }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Cookie session may still authenticate same-origin web requests.
  }
  return headers
}

export async function nsApiJson(path, body, { method = 'POST' } = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers: await getNsApiFetchHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof data?.error === 'string' ? data.error : `Request failed (${response.status})`
    const err = new Error(message)
    err.status = response.status
    err.data = data
    throw err
  }
  return data
}

export { apiBase }
