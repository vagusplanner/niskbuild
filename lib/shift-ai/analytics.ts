import 'server-only';

import type {
  AnalyticsActivityType,
  AnalyticsDateRange,
  AnalyticsSnapshot,
  HeatmapDay,
  MasteryBreakdown,
  SubjectActivityRow,
  TaskCompletionDay,
} from '@/lib/shift-ai/analytics-shared';
import type { GradeSignals } from '@/lib/shift-ai/grade-predictor-shared';
import { createAdminClient } from '@/lib/supabase/admin';

function cutoffIso(days: AnalyticsDateRange): string {
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return d.toISOString();
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export async function aggregateGradeSignals(
  studentId: string,
  subject: string
): Promise<GradeSignals> {
  const admin = createAdminClient();

  const [{ data: masteryRows }, { data: arcadeRows }, { data: decks }, { data: plannerRows }] =
    await Promise.all([
      admin
        .schema('firstparty')
        .from('shift_mastery_topics')
        .select('topic, status')
        .eq('student_id', studentId)
        .ilike('subject', subject),
      admin
        .schema('firstparty')
        .from('shift_arcade_scores')
        .select('questions_total, questions_correct, played_at')
        .eq('student_id', studentId)
        .ilike('subject', subject)
        .order('played_at', { ascending: false })
        .limit(20),
      admin
        .schema('firstparty')
        .from('shift_flashcard_decks')
        .select('id')
        .eq('student_id', studentId)
        .ilike('subject', subject),
      admin
        .schema('firstparty')
        .from('shift_planner_items')
        .select('completed')
        .eq('student_id', studentId),
    ]);

  const topics = masteryRows ?? [];
  const masteryTotal = topics.length;
  const masteredCount = topics.filter((t) => t.status === 'mastered').length;
  const masteryPercent =
    masteryTotal > 0 ? Math.round((masteredCount / masteryTotal) * 100) : 0;

  const weakTopics = topics
    .filter((t) => t.status !== 'mastered')
    .slice(0, 5)
    .map((t) => ({ topic: t.topic, status: t.status }));

  const quizSessions = arcadeRows?.length ?? 0;
  let avgQuizScorePercent: number | null = null;
  if (quizSessions > 0) {
    const percents = (arcadeRows ?? [])
      .filter((r) => r.questions_total > 0)
      .map((r) => Math.round((r.questions_correct / r.questions_total) * 100));
    if (percents.length > 0) {
      avgQuizScorePercent = Math.round(
        percents.reduce((sum, v) => sum + v, 0) / percents.length
      );
    }
  }

  const deckIds = (decks ?? []).map((d) => d.id);
  let flashcardTotal = 0;
  let flashcardRetained = 0;
  if (deckIds.length > 0) {
    const { data: cards } = await admin
      .schema('firstparty')
      .from('shift_flashcards')
      .select('repetitions')
      .in('deck_id', deckIds);
    flashcardTotal = cards?.length ?? 0;
    flashcardRetained = (cards ?? []).filter((c) => (c.repetitions ?? 0) > 2).length;
  }
  const flashcardRetentionPercent =
    flashcardTotal > 0 ? Math.round((flashcardRetained / flashcardTotal) * 100) : null;

  const plannerTotal = plannerRows?.length ?? 0;
  const plannerCompleted = (plannerRows ?? []).filter((p) => p.completed).length;
  const plannerCompletionPercent =
    plannerTotal > 0 ? Math.round((plannerCompleted / plannerTotal) * 100) : 0;

  return {
    masteryPercent,
    avgQuizScorePercent,
    flashcardRetentionPercent,
    plannerCompletionPercent,
    masteredCount,
    masteryTotal,
    quizSessions,
    flashcardTotal,
    flashcardRetained,
    plannerTotal,
    plannerCompleted,
    weakTopics,
  };
}

export async function buildAnalyticsSnapshot(
  studentId: string,
  subjectOptions: string[],
  dateRange: AnalyticsDateRange,
  activityType: AnalyticsActivityType | 'all'
): Promise<AnalyticsSnapshot> {
  const admin = createAdminClient();
  const since = cutoffIso(dateRange);

  const [
    { data: plannerRows },
    { data: arcadeRows },
    { data: chatRows },
    { data: masteryRows },
    { data: deckRows },
  ] = await Promise.all([
      admin
        .schema('firstparty')
        .from('shift_planner_items')
        .select('completed, created_at')
        .eq('student_id', studentId)
        .gte('created_at', since),
    admin
      .schema('firstparty')
      .from('shift_arcade_scores')
      .select('subject, played_at')
      .eq('student_id', studentId)
      .gte('played_at', since),
    admin
      .schema('firstparty')
      .from('shift_chat_history')
      .select('subject, created_at')
      .eq('student_id', studentId)
      .gte('created_at', since),
    admin
      .schema('firstparty')
      .from('shift_mastery_topics')
      .select('subject, status, updated_at')
      .eq('student_id', studentId)
      .gte('updated_at', since),
    admin
      .schema('firstparty')
      .from('shift_flashcard_decks')
      .select('id, subject')
      .eq('student_id', studentId),
  ]);

  const deckIds = (deckRows ?? []).map((d) => d.id);
  let flashcardReviewRows: Array<{ deck_id: string; last_reviewed_at: string | null }> = [];
  if (deckIds.length > 0) {
    const { data } = await admin
      .schema('firstparty')
      .from('shift_flashcards')
      .select('deck_id, last_reviewed_at')
      .in('deck_id', deckIds)
      .not('last_reviewed_at', 'is', null)
      .gte('last_reviewed_at', since);
    flashcardReviewRows = data ?? [];
  }

  const deckSubject = new Map((deckRows ?? []).map((d) => [d.id, d.subject]));

  const subjects = subjectOptions.length > 0 ? subjectOptions : ['General'];
  const subjectActivity: SubjectActivityRow[] = subjects.map((subject) => {
    const plannerCount =
      activityType === 'all' || activityType === 'planner'
        ? subject === subjects[0]
          ? (plannerRows ?? []).length
          : 0
        : 0;
    const arcade =
      activityType === 'all' || activityType === 'arcade'
        ? (arcadeRows ?? []).filter((r) => !r.subject || r.subject === subject).length
        : 0;
    const chat =
      activityType === 'all' || activityType === 'chat'
        ? (chatRows ?? []).filter((r) => !r.subject || r.subject === subject).length
        : 0;
    const flashcards =
      activityType === 'all' || activityType === 'flashcards'
        ? flashcardReviewRows.filter((r) => deckSubject.get(r.deck_id) === subject).length
        : 0;
    const mastery =
      activityType === 'all' || activityType === 'mastery'
        ? (masteryRows ?? []).filter((r) => r.subject === subject).length
        : 0;

    return {
      subject,
      planner: plannerCount,
      arcade,
      chat,
      flashcards,
      total: plannerCount + arcade + chat + flashcards + mastery,
    };
  });

  const filteredMastery =
    activityType === 'all' || activityType === 'mastery' ? (masteryRows ?? []) : [];
  const masteryBreakdown: MasteryBreakdown = {
    mastered: filteredMastery.filter((r) => r.status === 'mastered').length,
    learning: filteredMastery.filter((r) => r.status === 'learning').length,
    not_started: filteredMastery.filter((r) => r.status === 'not_started').length,
  };

  const completionByDay = new Map<string, { completed: number; total: number }>();
  if (activityType === 'all' || activityType === 'planner') {
    for (const item of plannerRows ?? []) {
      const key = dayKey(item.created_at);
      const entry = completionByDay.get(key) ?? { completed: 0, total: 0 };
      entry.total += 1;
      if (item.completed) entry.completed += 1;
      completionByDay.set(key, entry);
    }
  }

  const taskCompletionOverTime: TaskCompletionDay[] = [...completionByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      label: formatDayLabel(date),
      completed: stats.completed,
      total: stats.total,
    }));

  return {
    subjectActivity: subjectActivity.filter((r) => r.total > 0 || subjects.length <= 6),
    masteryBreakdown,
    taskCompletionOverTime,
    totals: {
      plannerCompleted: (plannerRows ?? []).filter((p) => p.completed).length,
      plannerTotal: plannerRows?.length ?? 0,
      arcadeSessions: arcadeRows?.length ?? 0,
      flashcardReviews: flashcardReviewRows.length,
      chatMessages: chatRows?.length ?? 0,
      masteryUpdates: masteryRows?.length ?? 0,
    },
  };
}

export async function buildActivityHeatmap(
  studentId: string,
  days = 84
): Promise<HeatmapDay[]> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const [{ data: plannerRows }, { data: arcadeRows }, { data: chatRows }, { data: deckRows }] =
    await Promise.all([
      admin
        .schema('firstparty')
        .from('shift_planner_items')
        .select('completed, created_at')
        .eq('student_id', studentId)
        .gte('created_at', sinceIso),
      admin
        .schema('firstparty')
        .from('shift_arcade_scores')
        .select('played_at')
        .eq('student_id', studentId)
        .gte('played_at', sinceIso),
      admin
        .schema('firstparty')
        .from('shift_chat_history')
        .select('created_at')
        .eq('student_id', studentId)
        .gte('created_at', sinceIso),
      admin
        .schema('firstparty')
        .from('shift_flashcard_decks')
        .select('id')
        .eq('student_id', studentId),
    ]);

  const deckIds = (deckRows ?? []).map((d) => d.id);
  let cards: Array<{ last_reviewed_at: string | null }> = [];
  if (deckIds.length > 0) {
    const { data } = await admin
      .schema('firstparty')
      .from('shift_flashcards')
      .select('last_reviewed_at')
      .in('deck_id', deckIds)
      .not('last_reviewed_at', 'is', null)
      .gte('last_reviewed_at', sinceIso);
    cards = data ?? [];
  }

  const counts = new Map<string, number>();
  const bump = (iso: string | null | undefined) => {
    if (!iso) return;
    const key = dayKey(iso);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  for (const row of plannerRows ?? []) {
    if (row.completed) bump(row.created_at);
  }
  for (const row of arcadeRows ?? []) bump(row.played_at);
  for (const row of chatRows ?? []) bump(row.created_at);
  for (const row of cards ?? []) bump(row.last_reviewed_at);

  const result: HeatmapDay[] = [];
  const cursor = new Date(since);
  const end = new Date();
  while (cursor <= end) {
    const key = dayKey(cursor.toISOString());
    result.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
