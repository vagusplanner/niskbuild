export type DemographicTier =
  | 'unspecified'
  | 'under-18'
  | '18-25'
  | '26-40'
  | '41-55'
  | '55+';

export const DEMOGRAPHIC_OPTIONS: { value: DemographicTier; label: string }[] = [
  { value: 'under-18', label: 'Under 18' },
  { value: '18-25', label: '18–25' },
  { value: '26-40', label: '26–40' },
  { value: '41-55', label: '41–55' },
  { value: '55+', label: '55+' },
];

export function normalizeDemographicTier(value: unknown): DemographicTier {
  const allowed: DemographicTier[] = [
    'unspecified',
    'under-18',
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
