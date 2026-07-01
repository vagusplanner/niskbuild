import type { ShiftCurriculum } from '@/lib/shift-ai/constants';

/** Derive a key stage label from year group text for student profile storage. */
export function deriveKeyStage(yearGroup: string, curriculum: ShiftCurriculum): string {
  const y = yearGroup.trim().toLowerCase();

  if (curriculum === 'france') {
    if (y.includes('cm') || y.includes('cycle 3')) return 'Cycle 3';
    if (y.includes('6') || y.includes('5') || y.includes('4') || y.includes('3')) {
      return 'Collège';
    }
    if (y.includes('2nde') || y.includes('1ère') || y.includes('terminale')) {
      return 'Lycée';
    }
    return 'Collège';
  }

  if (curriculum === 'usa') {
    if (y.includes('elementary') || y.includes('k-') || y.includes('grade 1')) {
      return 'Elementary';
    }
    if (y.includes('middle') || y.includes('grade 6') || y.includes('grade 7')) {
      return 'Middle School';
    }
    if (y.includes('high') || y.includes('grade 9') || y.includes('grade 10')) {
      return 'High School';
    }
    return 'Middle School';
  }

  // UK default
  const yearMatch = y.match(/year\s*(\d+)/i) ?? y.match(/\by(\d+)\b/i);
  const yearNum = yearMatch ? Number.parseInt(yearMatch[1], 10) : null;

  if (yearNum !== null) {
    if (yearNum <= 6) return 'Key Stage 2';
    if (yearNum <= 9) return 'Key Stage 3';
    if (yearNum <= 11) return 'Key Stage 4 (GCSEs)';
    return 'Key Stage 5 (A-Levels)';
  }

  if (y.includes('gcse') || y.includes('ks4')) return 'Key Stage 4 (GCSEs)';
  if (y.includes('a-level') || y.includes('ks5')) return 'Key Stage 5 (A-Levels)';
  if (y.includes('ks3')) return 'Key Stage 3';
  if (y.includes('ks2')) return 'Key Stage 2';

  return 'Key Stage 3';
}

export function defaultAgeRangeForAccount(
  accountType: 'supervised' | 'family'
): '7_8' | '11_12' {
  return accountType === 'family' ? '7_8' : '11_12';
}
