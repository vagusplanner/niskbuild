import type { ShiftCurriculum } from '@/lib/shift-ai/constants';

export const EXAM_BOARDS: Record<ShiftCurriculum, string[]> = {
  uk: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'Cambridge International', 'Eduqas'],
  france: [
    'Éducation Nationale',
    'Baccalauréat Général',
    'Baccalauréat Technologique',
    'Brevet des collèges',
  ],
  usa: ['Common Core', 'AP (College Board)', 'SAT/ACT Prep', 'State Standards'],
  saudi: [
    'Ministry of Education',
    'Qudurat (GAT)',
    'Tahsili (Achievement Test)',
  ],
};

export const EXAM_LEVELS: Record<ShiftCurriculum, string[]> = {
  uk: ['GCSE', 'A-Level', 'AS-Level', 'Key Stage 3'],
  france: ['3ème (Brevet)', 'Seconde', 'Première', 'Terminale (Bac)'],
  usa: ['Middle School (6–8)', 'High School (9–12)', 'AP Course', 'SAT/ACT Prep'],
  saudi: [
    'Primary (1–6)',
    'Intermediate (1–3)',
    'Secondary (1–3)',
    'Qudurat / Tahsili Prep',
  ],
};

export const CURRICULUM_RUBRICS: Record<ShiftCurriculum, string> = {
  uk: 'AQA/Edexcel assessment objectives (AO1 Knowledge, AO2 Analysis, AO3 Evaluation/Judgement)',
  france: 'Critères du Bac (Compréhension, Argumentation, Expression, Cohérence)',
  usa: 'AP/Common Core rubric (Claim, Evidence, Reasoning, Organization, Style)',
  saudi:
    'Ministry of Education outcomes (Knowledge, Understanding, Application) with Qudurat/Tahsili-style reasoning for secondary',
};

export function normalizeCurriculum(value: string | null | undefined): ShiftCurriculum {
  const v = (value || 'uk').toLowerCase();
  if (v === 'france' || v === 'fr') return 'france';
  if (v === 'usa' || v === 'us') return 'usa';
  if (v === 'saudi' || v === 'sa' || v === 'ksa') return 'saudi';
  return 'uk';
}
