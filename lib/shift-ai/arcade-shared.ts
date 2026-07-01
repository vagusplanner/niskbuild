export const ARCADE_GAME_DURATION_SEC = 60;
export const ARCADE_QUESTION_COUNT = 10;
export const ARCADE_BASE_POINTS = 10;
export const ARCADE_STREAK_BONUS = 3;

export type ArcadeQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  socraticHint: string;
};

export type ArcadeScoreRecord = {
  id: string;
  subject: string | null;
  score: number;
  questions_total: number;
  questions_correct: number;
  streak_bonus: number;
  played_at: string;
};

export function computeArcadeAnswerPoints(streakBeforeAnswer: number): {
  base: number;
  streakBonus: number;
  total: number;
} {
  const streakBonus = streakBeforeAnswer >= 2 ? ARCADE_STREAK_BONUS : 0;
  return {
    base: ARCADE_BASE_POINTS,
    streakBonus,
    total: ARCADE_BASE_POINTS + streakBonus,
  };
}
