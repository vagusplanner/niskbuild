import 'server-only';

import type { MentorChallenge } from '@/lib/shift-ai/observer-shared';
import { createAdminClient } from '@/lib/supabase/admin';

export async function listMentorChallenges(studentId: string): Promise<MentorChallenge[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_mentor_challenges')
    .select('id, student_id, mentor_token_id, title, description, reward_text, status, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  return (data ?? []) as MentorChallenge[];
}

export async function createMentorChallenge(input: {
  studentId: string;
  mentorTokenId: string;
  title: string;
  description?: string | null;
  rewardText?: string | null;
}): Promise<MentorChallenge> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_mentor_challenges')
    .insert({
      student_id: input.studentId,
      mentor_token_id: input.mentorTokenId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      reward_text: input.rewardText?.trim() || null,
      status: 'active',
    })
    .select('id, student_id, mentor_token_id, title, description, reward_text, status, created_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not create challenge');
  }

  return data as MentorChallenge;
}
