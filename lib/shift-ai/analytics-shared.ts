export type AnalyticsDateRange = '7' | '30' | '90';

export type AnalyticsActivityType = 'planner' | 'arcade' | 'flashcards' | 'chat' | 'mastery';

export type AnalyticsFilters = {
  subject: string;
  dateRange: AnalyticsDateRange;
  activityType: AnalyticsActivityType | 'all';
};

export type SubjectActivityRow = {
  subject: string;
  planner: number;
  arcade: number;
  flashcards: number;
  chat: number;
  total: number;
};

export type MasteryBreakdown = {
  mastered: number;
  learning: number;
  not_started: number;
};

export type TaskCompletionDay = {
  date: string;
  label: string;
  completed: number;
  total: number;
};

export type HeatmapDay = {
  date: string;
  count: number;
};

export type AnalyticsSnapshot = {
  subjectActivity: SubjectActivityRow[];
  masteryBreakdown: MasteryBreakdown;
  taskCompletionOverTime: TaskCompletionDay[];
  totals: {
    plannerCompleted: number;
    plannerTotal: number;
    arcadeSessions: number;
    flashcardReviews: number;
    chatMessages: number;
    masteryUpdates: number;
  };
};

export const ACTIVITY_TYPE_OPTIONS: Array<{ id: AnalyticsActivityType | 'all'; label: string }> = [
  { id: 'all', label: 'All activity' },
  { id: 'planner', label: 'Planner' },
  { id: 'arcade', label: 'Quiz Arcade' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'chat', label: 'Tutor chat' },
  { id: 'mastery', label: 'Mastery updates' },
];

export const DATE_RANGE_OPTIONS: Array<{ id: AnalyticsDateRange; label: string }> = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
];
