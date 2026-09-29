/**
 * Phase 1 auth — Supabase.
 * Live entities: LeadershipGoal, GoalCheckIn, CoachingSession, Commitment,
 * LearningPath, Booking (SELECT/list only — writes need service-role handlers).
 * Remaining entities: list/filter/get return empty until their milestones;
 * create/update/delete still reject so writes aren't silently dropped.
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
