import { redirect } from 'next/navigation';
import ShiftAiVoiceBuddyClient from '@/app/builder/shift-ai/voice-buddy/ShiftAiVoiceBuddyClient';
import { BUDDY_GAMES } from '@/lib/shift-ai/voice-buddy';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

const FRIEND_NAMES = ['Pip', 'Beeper', 'Luna', 'Boots'] as const;

export default async function ShiftAiVoiceBuddyPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

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

  const friendName = FRIEND_NAMES[Math.floor(Math.random() * FRIEND_NAMES.length)];

  return <ShiftAiVoiceBuddyClient games={BUDDY_GAMES} friendName={friendName} />;
}

export async function generateMetadata() {
  return {
    title: 'Voice Buddy · Shift AI',
    robots: 'noindex',
  };
}
