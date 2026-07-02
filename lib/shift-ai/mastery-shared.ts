export const MASTERY_STATUSES = ['not_started', 'learning', 'mastered'] as const;

export type MasteryStatus = (typeof MASTERY_STATUSES)[number];

export type MasteryTopic = {
  id: string;
  student_id: string;
  subject: string;
  topic: string;
  status: MasteryStatus;
  updated_at: string;
  created_at: string;
};

export type MasterySubjectGroup = {
  subject: string;
  topics: MasteryTopic[];
  masteredCount: number;
  masteredPercent: number;
};

export function isMasteryStatus(value: string): value is MasteryStatus {
  return (MASTERY_STATUSES as readonly string[]).includes(value);
}

export function cycleMasteryStatus(status: MasteryStatus): MasteryStatus {
  if (status === 'not_started') return 'learning';
  if (status === 'learning') return 'mastered';
  return 'not_started';
}

export function subjectMasteryProgress(topics: MasteryTopic[]) {
  const total = topics.length;
  const masteredCount = topics.filter((t) => t.status === 'mastered').length;
  const learningCount = topics.filter((t) => t.status === 'learning').length;
  const notStartedCount = topics.filter((t) => t.status === 'not_started').length;
  const masteredPercent = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

  return { total, masteredCount, learningCount, notStartedCount, masteredPercent };
}

export function groupMasteryBySubject(
  topics: MasteryTopic[],
  subjectOrder: string[]
): MasterySubjectGroup[] {
  const bySubject = new Map<string, MasteryTopic[]>();

  for (const topic of topics) {
    const list = bySubject.get(topic.subject) ?? [];
    list.push(topic);
    bySubject.set(topic.subject, list);
  }

  const orderedSubjects = [
    ...subjectOrder.filter((s) => bySubject.has(s)),
    ...[...bySubject.keys()].filter((s) => !subjectOrder.includes(s)).sort(),
  ];

  return orderedSubjects.map((subject) => {
    const subjectTopics = (bySubject.get(subject) ?? []).sort((a, b) =>
      a.topic.localeCompare(b.topic)
    );
    const progress = subjectMasteryProgress(subjectTopics);
    return {
      subject,
      topics: subjectTopics,
      masteredCount: progress.masteredCount,
      masteredPercent: progress.masteredPercent,
    };
  });
}
