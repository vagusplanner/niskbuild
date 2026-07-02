import 'server-only';

import type {
  GroupFlashcardSet,
  GroupLeaderboardEntry,
  GroupMember,
  GroupNote,
  StudyGroup,
} from '@/lib/shift-ai/groups-shared';
import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';
import { createAdminClient } from '@/lib/supabase/admin';

export async function isGroupMember(groupId: string, studentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('student_id', studentId)
    .maybeSingle();
  return Boolean(data);
}

export async function listGroupsForStudent(studentId: string): Promise<StudyGroup[]> {
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .schema('firstparty')
    .from('shift_group_members')
    .select('group_id')
    .eq('student_id', studentId);

  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (groupIds.length === 0) return [];

  const { data: groups } = await admin
    .schema('firstparty')
    .from('shift_study_groups')
    .select('id, name, invite_code, created_by, subject, created_at')
    .in('id', groupIds)
    .order('created_at', { ascending: false });

  const { data: memberCounts } = await admin
    .schema('firstparty')
    .from('shift_group_members')
    .select('group_id')
    .in('group_id', groupIds);

  const countByGroup = new Map<string, number>();
  for (const row of memberCounts ?? []) {
    countByGroup.set(row.group_id, (countByGroup.get(row.group_id) ?? 0) + 1);
  }

  return (groups ?? []).map((g) => ({
    ...g,
    member_count: countByGroup.get(g.id) ?? 0,
  })) as StudyGroup[];
}

export async function getGroupForMember(
  groupId: string,
  studentId: string
): Promise<StudyGroup | null> {
  const member = await isGroupMember(groupId, studentId);
  if (!member) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_study_groups')
    .select('id, name, invite_code, created_by, subject, created_at')
    .eq('id', groupId)
    .maybeSingle();

  return (data as StudyGroup) ?? null;
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_group_members')
    .select('id, group_id, student_id, joined_at')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  const members = data ?? [];
  const studentIds = members.map((m) => m.student_id);
  if (studentIds.length === 0) return [];

  const { data: students } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, full_name')
    .in('id', studentIds);

  const nameById = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  return members.map((m) => ({
    ...m,
    full_name: nameById.get(m.student_id) ?? 'Student',
  })) as GroupMember[];
}

export async function getGroupNotes(groupId: string): Promise<GroupNote[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_group_notes')
    .select('id, group_id, student_id, content, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(50);

  const notes = data ?? [];
  const studentIds = [...new Set(notes.map((n) => n.student_id))];
  const { data: students } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, full_name')
    .in('id', studentIds);

  const nameById = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  return notes.map((n) => ({
    ...n,
    author_name: nameById.get(n.student_id) ?? 'Student',
  })) as GroupNote[];
}

export async function getGroupFlashcardSets(groupId: string): Promise<GroupFlashcardSet[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_group_flashcard_sets')
    .select('id, group_id, student_id, topic, cards, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  const sets = data ?? [];
  const studentIds = [...new Set(sets.map((s) => s.student_id))];
  const { data: students } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, full_name')
    .in('id', studentIds);

  const nameById = new Map((students ?? []).map((s) => [s.id, s.full_name]));

  return sets.map((row) => ({
    id: row.id,
    group_id: row.group_id,
    student_id: row.student_id,
    topic: row.topic,
    cards: Array.isArray(row.cards) ? row.cards : [],
    created_at: row.created_at,
    author_name: nameById.get(row.student_id) ?? 'Student',
  })) as GroupFlashcardSet[];
}

/** Best arcade score per member — scoped to group membership only (server-side). */
export async function getGroupLeaderboard(groupId: string): Promise<GroupLeaderboardEntry[]> {
  const members = await getGroupMembers(groupId);
  if (members.length === 0) return [];

  const studentIds = members.map((m) => m.student_id);
  const admin = createAdminClient();
  const { data: scores } = await admin
    .schema('firstparty')
    .from('shift_arcade_scores')
    .select('student_id, score')
    .in('student_id', studentIds);

  const bestByStudent = new Map<string, { best: number; count: number }>();
  for (const row of scores ?? []) {
    const current = bestByStudent.get(row.student_id) ?? { best: 0, count: 0 };
    current.count += 1;
    current.best = Math.max(current.best, row.score ?? 0);
    bestByStudent.set(row.student_id, current);
  }

  return members
    .map((m) => {
      const stats = bestByStudent.get(m.student_id) ?? { best: 0, count: 0 };
      return {
        student_id: m.student_id,
        full_name: m.full_name ?? 'Student',
        best_score: stats.best,
        games_played: stats.count,
      };
    })
    .filter((e) => e.best_score > 0)
    .sort((a, b) => b.best_score - a.best_score);
}

export async function createStudyGroup(input: {
  studentId: string;
  name: string;
  subject?: string | null;
}): Promise<StudyGroup> {
  const admin = createAdminClient();
  const { data: group, error } = await admin
    .schema('firstparty')
    .from('shift_study_groups')
    .insert({
      name: input.name.trim(),
      subject: input.subject?.trim() || null,
      created_by: input.studentId,
    })
    .select('id, name, invite_code, created_by, subject, created_at')
    .single();

  if (error || !group) {
    throw new Error(error?.message || 'Could not create group');
  }

  const { error: memberError } = await admin.schema('firstparty').from('shift_group_members').insert({
    group_id: group.id,
    student_id: input.studentId,
  });

  if (memberError) {
    throw new Error(memberError.message || 'Could not add creator to group');
  }

  return { ...group, member_count: 1 } as StudyGroup;
}

export async function joinStudyGroupByCode(
  studentId: string,
  inviteCode: string
): Promise<StudyGroup> {
  const admin = createAdminClient();
  const code = inviteCode.trim();

  const { data: group } = await admin
    .schema('firstparty')
    .from('shift_study_groups')
    .select('id, name, invite_code, created_by, subject, created_at')
    .eq('invite_code', code)
    .maybeSingle();

  if (!group) {
    throw new Error('Group not found — check the invite code');
  }

  const already = await isGroupMember(group.id, studentId);
  if (already) {
    return group as StudyGroup;
  }

  const { error } = await admin.schema('firstparty').from('shift_group_members').insert({
    group_id: group.id,
    student_id: studentId,
  });

  if (error) {
    throw new Error(error.message || 'Could not join group');
  }

  return group as StudyGroup;
}

export async function addGroupNote(input: {
  groupId: string;
  studentId: string;
  content: string;
}): Promise<GroupNote> {
  const member = await isGroupMember(input.groupId, input.studentId);
  if (!member) {
    throw new Error('Not a member of this group');
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_group_notes')
    .insert({
      group_id: input.groupId,
      student_id: input.studentId,
      content: input.content.trim(),
    })
    .select('id, group_id, student_id, content, created_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not post note');
  }

  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('full_name')
    .eq('id', input.studentId)
    .maybeSingle();

  return { ...data, author_name: student?.full_name ?? 'Student' } as GroupNote;
}

export async function generateGroupFlashcardSet(input: {
  groupId: string;
  studentId: string;
  topic: string;
  subject?: string | null;
}): Promise<GroupFlashcardSet> {
  const member = await isGroupMember(input.groupId, input.studentId);
  if (!member) {
    throw new Error('Not a member of this group');
  }

  const groq = getGroqClient();
  if (!groq) {
    throw new Error('Flashcard generator is temporarily unavailable');
  }

  const subjectLabel = input.subject?.trim() || 'this subject';
  const prompt = `Create 8 flashcards for the topic "${input.topic}" in ${subjectLabel}.
Return JSON: { "cards": [{ "front": "", "back": "" }] }
${GROQ_JSON_ONLY_INSTRUCTION}`;

  const completion = await withGroqTimeout(
    groq.chat.completions.create({
      model: SHIFT_GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You create concise study flashcards for students.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })
  );

  const raw = completion.choices[0]?.message?.content ?? '';
  const parsed = parseGroqJsonContent(raw, 'Could not parse flashcards');
  if (!parsed.ok) {
    logGroqParseFailure('group flashcards', raw, parsed.error);
    throw new Error(parsed.error);
  }

  const data = parsed.json as Record<string, unknown>;
  const cards = Array.isArray(data.cards)
    ? data.cards
        .filter((c): c is { front: string; back: string } => {
          if (!c || typeof c !== 'object') return false;
          const row = c as Record<string, unknown>;
          return typeof row.front === 'string' && typeof row.back === 'string';
        })
        .map((c) => ({ front: c.front.trim(), back: c.back.trim() }))
        .filter((c) => c.front && c.back)
    : [];

  if (cards.length === 0) {
    throw new Error('Could not generate flashcards');
  }

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .schema('firstparty')
    .from('shift_group_flashcard_sets')
    .insert({
      group_id: input.groupId,
      student_id: input.studentId,
      topic: input.topic.trim(),
      cards,
    })
    .select('id, group_id, student_id, topic, cards, created_at')
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || 'Could not save flashcard set');
  }

  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('full_name')
    .eq('id', input.studentId)
    .maybeSingle();

  return {
    ...inserted,
    cards,
    author_name: student?.full_name ?? 'Student',
  } as GroupFlashcardSet;
}
