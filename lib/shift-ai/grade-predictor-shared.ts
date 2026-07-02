export type GradeSignals = {
  masteryPercent: number;
  avgQuizScorePercent: number | null;
  flashcardRetentionPercent: number | null;
  plannerCompletionPercent: number;
  masteredCount: number;
  masteryTotal: number;
  quizSessions: number;
  flashcardTotal: number;
  flashcardRetained: number;
  plannerTotal: number;
  plannerCompleted: number;
  weakTopics: Array<{ topic: string; status: string }>;
};

export type GradePredictionResult = {
  predicted_grade: string;
  confidence: number;
  priority_topics: string[];
  improvement_plan: string;
  signals: GradeSignals;
};

export type SavedGradePrediction = {
  id: string;
  subject: string;
  predicted_grade: string;
  confidence: number;
  factors: GradePredictionResult;
  generated_at: string;
};
