export const SPEC_STATUSES = ['not_covered', 'covered', 'needs_review'] as const;

export type SpecStatus = (typeof SPEC_STATUSES)[number];

export type SpecPoint = {
  id: string;
  student_id: string;
  subject: string;
  spec_code: string;
  description: string;
  status: SpecStatus;
  updated_at: string;
};

export const SPEC_STATUS_LABELS: Record<SpecStatus, string> = {
  not_covered: 'Not covered',
  covered: 'Covered',
  needs_review: 'Needs review',
};

export const SPEC_STATUS_STYLES: Record<SpecStatus, string> = {
  not_covered: 'border-red-200 bg-red-50 text-red-800',
  covered: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  needs_review: 'border-amber-200 bg-amber-50 text-amber-800',
};

export function isSpecStatus(value: string): value is SpecStatus {
  return (SPEC_STATUSES as readonly string[]).includes(value);
}

export function cycleSpecStatus(status: SpecStatus): SpecStatus {
  if (status === 'not_covered') return 'covered';
  if (status === 'covered') return 'needs_review';
  return 'not_covered';
}
