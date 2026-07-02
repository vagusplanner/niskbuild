export type EssayAnnotation = {
  excerpt: string;
  comment: string;
};

export type EssayAssessmentObjective = {
  name: string;
  marks_awarded: string;
  marks_available: string;
  comment: string;
  strengths?: string[];
  improvements?: string[];
};

export type EssayStructureRating = {
  rating: 'excellent' | 'good' | 'needs_work' | 'poor' | string;
  comment?: string;
};

export type EssayMarkerFeedback = {
  grade_estimate: string;
  overall_mark?: string;
  grade_boundary?: string;
  overall_comment: string;
  assessment_objectives: EssayAssessmentObjective[];
  annotations: EssayAnnotation[];
  structural_critique: {
    introduction: EssayStructureRating;
    arguments: EssayStructureRating;
    evidence: EssayStructureRating;
    conclusion: EssayStructureRating;
    overall_comment: string;
    improvements: string[];
  };
  rewrite_suggestions: string[];
  key_strengths?: string[];
  priority_improvements?: string[];
  examiner_tip?: string;
};

export const STRUCTURE_RATING_STYLES: Record<string, string> = {
  excellent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  good: 'border-blue-200 bg-blue-50 text-blue-700',
  needs_work: 'border-amber-200 bg-amber-50 text-amber-700',
  poor: 'border-red-200 bg-red-50 text-red-700',
};

export function gradeColor(grade: string): string {
  const u = grade.toUpperCase();
  if (u.includes('9') || u.includes('A*') || /^A/.test(u)) return 'text-emerald-600';
  if (u.includes('7') || u.includes('8') || /^B/.test(u)) return 'text-blue-600';
  if (/[456C]/.test(u)) return 'text-amber-600';
  return 'text-red-600';
}
