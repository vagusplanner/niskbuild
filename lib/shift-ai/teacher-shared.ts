export type TeacherStudentSummary = {
  id: string;
  full_name: string;
  year_group: string;
  key_stage: string;
  notesCount: number;
  plannerCompleted: number;
  plannerTotal: number;
  masteryPercent: number;
  arcadeBestScore: number;
};

export type TeacherNarrativeResult = {
  narrative: string;
  key_strengths: string[];
  areas_for_growth: string[];
};

export type TeacherStudentDetail = TeacherStudentSummary & {
  weakTopics: Array<{ subject: string; topic: string }>;
  recentArcade: Array<{ subject: string | null; score: number; played_at: string }>;
};
