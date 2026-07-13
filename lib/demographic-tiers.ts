export type DemographicTier =
  | 'unspecified'
  | '13-17'
  | '18-25'
  | '26-40'
  | '41-55'
  | '55+';

/** Aligns with Terms/Privacy minimum age of 13 (no under-13 bucket). */
export const DEMOGRAPHIC_OPTIONS: { value: DemographicTier; label: string }[] = [
  { value: '13-17', label: '13–17' },
  { value: '18-25', label: '18–25' },
  { value: '26-40', label: '26–40' },
  { value: '41-55', label: '41–55' },
  { value: '55+', label: '55+' },
];

export function normalizeDemographicTier(value: unknown): DemographicTier {
  // Legacy value from before the under-13 age gate was enforced.
  if (value === 'under-18') return '13-17';

  const allowed: DemographicTier[] = [
    'unspecified',
    '13-17',
    '18-25',
    '26-40',
    '41-55',
    '55+',
  ];
  if (typeof value === 'string' && allowed.includes(value as DemographicTier)) {
    return value as DemographicTier;
  }
  return 'unspecified';
}
