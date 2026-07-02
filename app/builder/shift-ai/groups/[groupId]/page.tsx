import { redirect } from 'next/navigation';
import ShiftAiGroupDetailClient from '@/app/builder/shift-ai/groups/[groupId]/ShiftAiGroupDetailClient';
import {
  getGroupFlashcardSets,
  getGroupForMember,
  getGroupLeaderboard,
  getGroupMembers,
  getGroupNotes,
  isGroupMember,
} from '@/lib/shift-ai/groups';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiGroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const session = await getSafeSession();
  if (!session?.user) redirect('/builder/shift-ai/login');

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student || needsSubjectOnboarding(student)) {
    redirect('/builder/shift-ai/onboarding');
  }

  const { groupId } = await params;
  const member = await isGroupMember(groupId, student.id);
  if (!member) {
    redirect('/builder/shift-ai/groups?error=not-a-member');
  }

  const group = await getGroupForMember(groupId, student.id);
  if (!group) {
    redirect('/builder/shift-ai/groups?error=not-found');
  }

  const [members, notes, flashcardSets, leaderboard] = await Promise.all([
    getGroupMembers(groupId),
    getGroupNotes(groupId),
    getGroupFlashcardSets(groupId),
    getGroupLeaderboard(groupId),
  ]);

  return (
    <ShiftAiGroupDetailClient
      group={group}
      currentStudentId={student.id}
      members={members}
      initialNotes={notes}
      initialFlashcardSets={flashcardSets}
      leaderboard={leaderboard}
    />
  );
}

export async function generateMetadata() {
  return { title: 'Study Group · Shift AI', robots: 'noindex' };
}
