/** Social Hub content plan — Phase 0–4, UGC ramp, weekly review rules */

export const SOCIAL_PHASES = [
  {
    phase: 0,
    title: 'Foundation',
    weeks: '1–3',
    goals: ['Connect Buffer', 'Publish 3×/week', 'Establish voice'],
  },
  {
    phase: 1,
    title: 'Momentum',
    weeks: '4–5',
    goals: ['UGC ramp to 25%', 'Theme bank rotation', 'Weekly review cadence'],
  },
  {
    phase: 2,
    title: 'Scale',
    weeks: '6–7',
    goals: ['UGC ramp to 50%', 'Cross-platform repurposing', 'Builder showcase posts'],
  },
  {
    phase: 3,
    title: 'Community',
    weeks: '8–9',
    goals: ['UGC ramp to 75%', 'User spotlights', 'Template drops'],
  },
  {
    phase: 4,
    title: 'Optimize',
    weeks: '10–12',
    goals: ['Analytics review', 'Top-performing themes', 'Paid amplification tests'],
  },
] as const;

/** UGC percentage ramp across weeks 4–7 */
export const UGC_RAMP_BY_WEEK: Record<number, number> = {
  4: 25,
  5: 25,
  6: 50,
  7: 75,
};

export const WEEKLY_REVIEW_RULES = [
  'Review last week’s published vs scheduled posts',
  'Pick 2 themes from the bank for next week',
  'Note top engagement platform and adjust copy length',
  'Flag any failed Buffer publishes and retry or edit',
  'Update UGC % if entering weeks 4–7 ramp window',
] as const;

export function ugcPercentageForWeek(week: number): number {
  if (week < 4) return 0;
  if (week >= 8) return 75;
  return UGC_RAMP_BY_WEEK[week] ?? 25;
}
