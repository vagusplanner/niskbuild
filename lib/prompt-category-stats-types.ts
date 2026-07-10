import type { CohortCount, ThresholdedRow } from '@/lib/cohort-threshold';

export type DemandGranularity = 'week' | 'month' | 'quarter';

export type DemandAnalyticsDashboard = {
  minCohortThreshold: number;
  granularity: DemandGranularity;
  rangeLabel: string;
  totalBuilds: CohortCount;
  topCategories: ThresholdedRow<{ category: string; label: string; count: number }>[];
  trend: ThresholdedRow<{ period: string; label: string; count: number }>[];
  byRegion: ThresholdedRow<{ region: string; count: number }>[];
  byAgeRange: ThresholdedRow<{ ageRange: string; label: string; count: number }>[];
  byCategoryAndRegion: ThresholdedRow<{
    category: string;
    categoryLabel: string;
    region: string;
    count: number;
  }>[];
  byCategoryAndAge: ThresholdedRow<{
    category: string;
    categoryLabel: string;
    ageRange: string;
    ageLabel: string;
    count: number;
  }>[];
};
