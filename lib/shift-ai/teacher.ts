import 'server-only';

import type { TeacherNarrativeResult, TeacherStudentDetail, TeacherStudentSummary } from '@/lib/shift-ai/teacher-shared';
import { getGroqClient } from '@/lib/groq-client';
import { getStudentLanguage, withLanguageInstruction } from '@/lib/shift-ai/study-language';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getTeacherForUser(userId: string): Promise<{ id: string; school_id: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_teachers')
    .select('id, school_id')
    .eq('user_id', userId)
    .maybeSingle();

  return data ?? null;
}

export async function verifyTeacherStudentAccess(
  teacherSchoolId: string,
  studentId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id')
    .eq('id', studentId)
    .eq('school_id', teacherSchoolId)
    .maybeSingle();

  return Boolean(data);
}

export async function listTeacherStudents(schoolId: string): Promise<TeacherStudentSummary[]> {
  const admin = createAdminClient();
  const { data: students } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, full_name, year_group, key_stage')
    .eq('school_id', schoolId)
    .order('full_name');

  if (!students?.length) return [];

  const studentIds = students.map((s) => s.id);

  const [{ data: plannerRows }, { data: masteryRows }, { data: arcadeRows }, { data: noteRows }] =
    await Promise.all([
      admin
        .schema('firstparty')
        .from('shift_planner_items')
        .select('student_id, completed')
        .in('student_id', studentIds),
      admin
        .schema('firstparty')
        .from('shift_mastery_topics')
        .select('student_id, status')
        .in('student_id', studentIds),
      admin
        .schema('firstparty')
        .from('shift_arcade_scores')
        .select('student_id, score')
        .in('student_id', studentIds),
      admin
        .schema('firstparty')
        .from('shift_notes')
        .select('student_id')
        .in('student_id', studentIds),
    ]);

  return students.map((student) => {
    const planner = (plannerRows ?? []).filter((p) => p.student_id === student.id);
    const mastery = (masteryRows ?? []).filter((m) => m.student_id === student.id);
    const arcade = (arcadeRows ?? []).filter((a) => a.student_id === student.id);
    const notes = (noteRows ?? []).filter((n) => n.student_id === student.id);

    const masteryTotal = mastery.length;
    const mastered = mastery.filter((m) => m.status === 'mastered').length;
    const masteryPercent =
      masteryTotal > 0 ? Math.round((mastered / masteryTotal) * 100) : 0;

    return {
      id: student.id,
      full_name: student.full_name,
      year_group: student.year_group,
      key_stage: student.key_stage,
      notesCount: notes.length,
      plannerCompleted: planner.filter((p) => p.completed).length,
      plannerTotal: planner.length,
      masteryPercent,
      arcadeBestScore: arcade.reduce((best, row) => Math.max(best, row.score ?? 0), 0),
    };
  });
}

export async function getTeacherStudentDetail(
  schoolId: string,
  studentId: string
): Promise<TeacherStudentDetail | null> {
  const allowed = await verifyTeacherStudentAccess(schoolId, studentId);
  if (!allowed) return null;

  const summaries = await listTeacherStudents(schoolId);
  const summary = summaries.find((s) => s.id === studentId);
  if (!summary) return null;

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: weakRows }, { data: arcadeRows }] = await Promise.all([
    admin
      .schema('firstparty')
      .from('shift_mastery_topics')
      .select('subject, topic, status')
      .eq('student_id', studentId)
      .neq('status', 'mastered')
      .order('updated_at', { ascending: false })
      .limit(8),
    admin
      .schema('firstparty')
      .from('shift_arcade_scores')
      .select('subject, score, played_at')
      .eq('student_id', studentId)
      .gte('played_at', weekAgo)
      .order('played_at', { ascending: false })
      .limit(10),
  ]);

  return {
    ...summary,
    weakTopics: (weakRows ?? []).map((r) => ({ subject: r.subject, topic: r.topic })),
    recentArcade: arcadeRows ?? [],
  };
}

export async function generateTeacherNarrative(
  schoolId: string,
  studentId: string
): Promise<TeacherNarrativeResult> {
  const detail = await getTeacherStudentDetail(schoolId, studentId);
  if (!detail) {
    throw new Error('Student not found');
  }

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: masteryRows }, { data: plannerRows }] = await Promise.all([
    admin
      .schema('firstparty')
      .from('shift_mastery_topics')
      .select('subject, topic, status, updated_at')
      .eq('student_id', studentId),
    admin
      .schema('firstparty')
      .from('shift_planner_items')
      .select('title, completed, due_date, item_type')
      .eq('student_id', studentId)
      .gte('created_at', weekAgo),
  ]);

  const mastery = masteryRows ?? [];
  const masteredTopics = mastery.filter((m) => m.status === 'mastered').map((m) => `${m.subject}: ${m.topic}`);
  const strugglingTopics = mastery
    .filter((m) => m.status === 'learning' || m.status === 'not_started')
    .slice(0, 6)
    .map((m) => `${m.subject}: ${m.topic} (${m.status.replace('_', ' ')})`);

  const planner = plannerRows ?? [];
  const completedThisWeek = planner.filter((p) => p.completed).length;
  const pendingThisWeek = planner.filter((p) => !p.completed);

  const arcadeSummary = detail.recentArcade
    .map((s) => `${s.subject || 'General'} score ${s.score}`)
    .join('; ');

  const groq = getGroqClient();
  if (!groq) {
    throw new Error('AI narrative is temporarily unavailable');
  }

  const language = await getStudentLanguage(studentId);
  const prompt = withLanguageInstruction(
    `You are writing a weekly "Progress Narrative" for a teacher to share with a parent.
Use ONLY the real data below — cite specific subject names, percentages, and numbers. No generic praise.

Student: ${detail.full_name} (${detail.year_group}, ${detail.key_stage})
Overall mastery: ${detail.masteryPercent}% across ${mastery.length} tracked topics
Planner this week: ${completedThisWeek}/${planner.length} tasks completed
Planner totals: ${detail.plannerCompleted}/${detail.plannerTotal} all-time completed
Mastered topics: ${masteredTopics.slice(0, 8).join('; ') || 'none yet'}
Struggling topics: ${strugglingTopics.join('; ') || 'none flagged'}
Weak areas: ${detail.weakTopics.map((t) => `${t.subject} — ${t.topic}`).join('; ') || 'none'}
Quiz arcade this week: ${arcadeSummary || 'no sessions'}
Best arcade score: ${detail.arcadeBestScore || 0}

Write JSON:
{
  "narrative": "3-4 sentence paragraph — specific, warm, teacher-friendly, parent-shareable",
  "key_strengths": ["2-3 short phrases with real subject/topic names"],
  "areas_for_growth": ["2-3 short phrases naming real weak areas"]
}
${GROQ_JSON_ONLY_INSTRUCTION}`,
    language
  );

  const completion = await withGroqTimeout(
    groq.chat.completions.create({
      model: SHIFT_GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: withLanguageInstruction(
            'You write concise, data-driven school progress summaries for teachers and parents.',
            language
          ),
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    })
  );

  const raw = completion.choices[0]?.message?.content ?? '';
  const parsed = parseGroqJsonContent(raw, 'Could not parse narrative');
  if (!parsed.ok) {
    logGroqParseFailure('teacher narrative', raw, parsed.error);
    throw new Error(parsed.error);
  }

  const data = parsed.json as Record<string, unknown>;
  const narrative = typeof data.narrative === 'string' ? data.narrative.trim() : '';
  if (!narrative) {
    throw new Error('Could not generate narrative');
  }

  return {
    narrative,
    key_strengths: Array.isArray(data.key_strengths)
      ? data.key_strengths.filter((v): v is string => typeof v === 'string').slice(0, 4)
      : [],
    areas_for_growth: Array.isArray(data.areas_for_growth)
      ? data.areas_for_growth.filter((v): v is string => typeof v === 'string').slice(0, 4)
      : [],
  };
}
