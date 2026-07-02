import 'server-only';

import type { ObserverActivitySummary, ObserverPlannerSummary, ObserverSnapshot } from '@/lib/shift-ai/observer-shared';
import { groupMasteryBySubject } from '@/lib/shift-ai/mastery-shared';
import { createAdminClient } from '@/lib/supabase/admin';

function startOfTodayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function getObserverSnapshot(studentId: string): Promise<ObserverSnapshot | null> {
  const admin = createAdminClient();

  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('full_name, year_group, key_stage, curriculum, favourite_subjects')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) return null;

  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  const today = startOfTodayIso();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { data: plannerRows },
    { data: masteryRows },
    { data: arcadeRows },
    { data: deckRows },
  ] = await Promise.all([
    admin
      .schema('firstparty')
      .from('shift_planner_items')
      .select('id, title, item_type, due_date, completed')
      .eq('student_id', studentId)
      .order('due_date', { ascending: true }),
    admin
      .schema('firstparty')
      .from('shift_mastery_topics')
      .select('id, student_id, subject, topic, status, updated_at, created_at')
      .eq('student_id', studentId),
    admin
      .schema('firstparty')
      .from('shift_arcade_scores')
      .select('subject, score, played_at')
      .eq('student_id', studentId)
      .order('played_at', { ascending: false })
      .limit(20),
    admin
      .schema('firstparty')
      .from('shift_flashcard_decks')
      .select('id')
      .eq('student_id', studentId),
  ]);

  const planner = buildPlannerSummary(plannerRows ?? [], today);
  const mastery = groupMasteryBySubject(masteryRows ?? [], subjectOptions);

  const deckIds = (deckRows ?? []).map((d) => d.id);
  let flashcardReviewsLast7Days = 0;
  if (deckIds.length > 0) {
    const { count } = await admin
      .schema('firstparty')
      .from('shift_flashcards')
      .select('id', { count: 'exact', head: true })
      .in('deck_id', deckIds)
      .not('last_reviewed_at', 'is', null)
      .gte('last_reviewed_at', weekAgo);
    flashcardReviewsLast7Days = count ?? 0;
  }

  const arcadeGames = arcadeRows ?? [];
  const activity: ObserverActivitySummary = {
    arcadeGamesPlayed: arcadeGames.length,
    arcadeBestScore: arcadeGames.reduce((best, row) => Math.max(best, row.score ?? 0), 0),
    arcadeRecentSubject: arcadeGames[0]?.subject ?? null,
    flashcardDecks: deckIds.length,
    flashcardReviewsLast7Days,
  };

  return {
    student: {
      fullName: student.full_name?.trim() || 'Student',
      yearGroup: student.year_group,
      keyStage: student.key_stage,
      curriculum: String(student.curriculum),
    },
    planner,
    mastery,
    activity,
  };
}

function buildPlannerSummary(
  rows: Array<{
    id: string;
    title: string;
    item_type: string;
    due_date: string;
    completed: boolean;
  }>,
  todayIso: string
): ObserverPlannerSummary {
  const open = rows.filter((r) => !r.completed);
  const completed = rows.filter((r) => r.completed).length;
  const overdue = open.filter((r) => r.due_date < todayIso);
  const upcoming = open.filter((r) => r.due_date >= todayIso);

  return {
    completed,
    overdue: overdue.length,
    upcoming: upcoming.length,
    total: rows.length,
    recentOverdue: overdue.slice(0, 5).map((r) => ({
      id: r.id,
      title: r.title,
      due_date: r.due_date,
      item_type: r.item_type,
    })),
    recentUpcoming: upcoming.slice(0, 5).map((r) => ({
      id: r.id,
      title: r.title,
      due_date: r.due_date,
      item_type: r.item_type,
    })),
  };
}
