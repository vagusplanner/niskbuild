/**
 * Phase 1 auth — Supabase.
 * Live entities: LeadershipGoal, GoalCheckIn, CoachingSession, Commitment,
 * LearningPath, Booking (SELECT/list only — writes need service-role handlers).
 * Remaining entities: list/filter/get return empty until their milestones;
 * create/update/delete still reject so writes aren't silently dropped.
 *
 * Integrations (InvokeLLM / UploadFile / TranscribeAudio / SendEmail) hit
 * NS-owned NiskBuild routes via VITE_API_BASE_URL (Vite proxies /api in local).
 */
import {
  getNsMe,
  nsIsAuthenticated,
  nsLogout,
  nsRedirectToLogin,
  updateNsMe,
} from '@/lib/ns-auth'
import { createBookingEntity } from '@/lib/ns-entities/booking'
import { createCoachingSessionEntity } from '@/lib/ns-entities/coaching-session'
import { createCommitmentEntity } from '@/lib/ns-entities/commitment'
import { createGoalCheckInEntity } from '@/lib/ns-entities/goal-check-in'
import { createLeadershipGoalEntity } from '@/lib/ns-entities/leadership-goal'
import { createLearningPathEntity } from '@/lib/ns-entities/learning-path'
import { supabase } from '@/lib/supabase'

function notMigrated(op) {
  return Promise.reject(
    new Error(
      `North South: "${op}" is not wired yet (entity/compat layer comes next).`
    )
  )
}

function entityStub(name) {
  return {
    // Soft reads so multi-entity Promise.all pages can load while entities are ported incrementally.
    list: async (..._a) => [],
    filter: async (..._a) => [],
    get: async (..._a) => null,
    create: (..._a) => notMigrated(`entities.${name}.create`),
    update: (..._a) => notMigrated(`entities.${name}.update`),
    delete: (..._a) => notMigrated(`entities.${name}.delete`),
  }
}

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
}

/** Bearer token for cross-origin NS API calls. Same-origin Vite proxy still uses cookies when present. */
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

async function nsApiJson(path, body, { method = 'POST' } = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers: await getNsApiFetchHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof data?.error === 'string' ? data.error : `Request failed (${response.status})`
    throw new Error(message)
  }
  return data
}

export const base44 = {
  auth: {
    me: () => getNsMe(),
    logout: (redirectTo) => {
      void nsLogout(redirectTo)
    },
    redirectToLogin: (fromUrl) => {
      nsRedirectToLogin(fromUrl)
    },
    updateMe: (updates) => updateNsMe(updates),
    isAuthenticated: () => nsIsAuthenticated(),
  },
  entities: {
    Booking: createBookingEntity(supabase),
    CoachingSession: createCoachingSessionEntity(supabase),
    Commitment: createCommitmentEntity(supabase),
    GoalCheckIn: createGoalCheckInEntity(supabase),
    LeadershipGoal: createLeadershipGoalEntity(supabase),
    LearningPath: createLearningPathEntity(supabase),
    Subscriber: entityStub('Subscriber'),
    Testimonial: entityStub('Testimonial'),
    User: entityStub('User'),
  },
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
        if (Array.isArray(normalized.file_urls) && normalized.file_urls.length > 0) {
          requestBody.file_urls = normalized.file_urls
        }

        const data = await nsApiJson('/api/north-south/llm', requestBody)

        // Plain-text callers expect a string, not { text }.
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

        const form = new FormData()
        const name =
          file.name ||
          (file.type?.includes('mp4') ? `audio_${Date.now()}.m4a` : `upload_${Date.now()}.bin`)
        form.append('file', file, name)

        const response = await fetch(`${apiBase()}/api/north-south/upload`, {
          method: 'POST',
          headers: await getNsApiFetchHeaders(),
          credentials: 'include',
          body: form,
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          const message =
            typeof data?.error === 'string' ? data.error : 'UploadFile request failed'
          throw new Error(message)
        }
        return data
      },

      TranscribeAudio: async (params) => {
        const normalized =
          typeof params === 'string'
            ? { audio_url: params }
            : params && typeof params === 'object'
              ? params
              : {}
        const audio_url =
          typeof normalized.audio_url === 'string' ? normalized.audio_url.trim() : ''
        if (!audio_url) {
          throw new Error('TranscribeAudio requires audio_url')
        }

        const data = await nsApiJson('/api/north-south/transcribe', { audio_url })
        // RolePlay expects a string; SpeechAnalyser accepts string or { text }.
        if (typeof data?.text === 'string') return data.text
        if (typeof data?.transcript === 'string') return data.transcript
        return data
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

        return nsApiJson('/api/north-south/email', { to, subject, body, replyTo })
      },
    },
  },
  functions: {
    invoke: (name, ..._a) => notMigrated(`functions.invoke(${name})`),
  },
}

export default base44
