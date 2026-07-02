export type StudyGroup = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  subject: string | null;
  created_at: string;
  member_count?: number;
};

export type GroupMember = {
  id: string;
  group_id: string;
  student_id: string;
  joined_at: string;
  full_name?: string;
};

export type GroupNote = {
  id: string;
  group_id: string;
  student_id: string;
  content: string;
  created_at: string;
  author_name?: string;
};

export type GroupFlashcardSet = {
  id: string;
  group_id: string;
  student_id: string;
  topic: string;
  cards: Array<{ front: string; back: string }>;
  created_at: string;
  author_name?: string;
};

export type GroupLeaderboardEntry = {
  student_id: string;
  full_name: string;
  best_score: number;
  games_played: number;
};
