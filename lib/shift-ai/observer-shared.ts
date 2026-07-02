import type { MasterySubjectGroup } from '@/lib/shift-ai/mastery-shared';

export type ObserverPlannerSummary = {
  completed: number;
  overdue: number;
  upcoming: number;
  total: number;
  recentOverdue: Array<{ id: string; title: string; due_date: string; item_type: string }>;
  recentUpcoming: Array<{ id: string; title: string; due_date: string; item_type: string }>;
};

export type ObserverActivitySummary = {
  arcadeGamesPlayed: number;
  arcadeBestScore: number;
  arcadeRecentSubject: string | null;
  flashcardDecks: number;
  flashcardReviewsLast7Days: number;
};

export type ObserverSnapshot = {
  student: {
    fullName: string;
    yearGroup: string;
    keyStage: string;
    curriculum: string;
  };
  planner: ObserverPlannerSummary;
  mastery: MasterySubjectGroup[];
  activity: ObserverActivitySummary;
};

export type MentorChallenge = {
  id: string;
  student_id: string;
  mentor_token_id: string;
  title: string;
  description: string | null;
  reward_text: string | null;
  status: string;
  created_at: string;
};
