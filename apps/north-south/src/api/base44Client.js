/**
 * Phase 1 auth — Supabase.
 * Entities: LeadershipGoal live; others stubbed until later milestones.
 */
import {
  getNsMe,
  nsIsAuthenticated,
  nsLogout,
  nsRedirectToLogin,
  updateNsMe,
} from '@/lib/ns-auth'
import { createLeadershipGoalEntity } from '@/lib/ns-entities/leadership-goal'
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
    list: (..._a) => notMigrated(`entities.${name}.list`),
    filter: (..._a) => notMigrated(`entities.${name}.filter`),
    get: (..._a) => notMigrated(`entities.${name}.get`),
    create: (..._a) => notMigrated(`entities.${name}.create`),
    update: (..._a) => notMigrated(`entities.${name}.update`),
    delete: (..._a) => notMigrated(`entities.${name}.delete`),
  }
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
    Booking: entityStub('Booking'),
    CoachingSession: entityStub('CoachingSession'),
    Commitment: entityStub('Commitment'),
    GoalCheckIn: entityStub('GoalCheckIn'),
    LeadershipGoal: createLeadershipGoalEntity(supabase),
    LearningPath: entityStub('LearningPath'),
    Subscriber: entityStub('Subscriber'),
    Testimonial: entityStub('Testimonial'),
    User: entityStub('User'),
  },
  integrations: {
    Core: {
      InvokeLLM: (..._a) => notMigrated('integrations.Core.InvokeLLM'),
      SendEmail: (..._a) => notMigrated('integrations.Core.SendEmail'),
      UploadFile: (..._a) => notMigrated('integrations.Core.UploadFile'),
      TranscribeAudio: (..._a) => notMigrated('integrations.Core.TranscribeAudio'),
    },
  },
  functions: {
    invoke: (name, ..._a) => notMigrated(`functions.invoke(${name})`),
  },
}

export default base44
