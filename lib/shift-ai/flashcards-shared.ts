export type FlashcardDeck = {
  id: string;
  student_id: string;
  subject: string | null;
  name: string;
  created_at: string;
  card_count: number;
};

export type Flashcard = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  created_at: string;
};

export type FlashcardDeckWithCards = FlashcardDeck & {
  cards: Flashcard[];
};

export type GeneratedFlashcard = {
  front: string;
  back: string;
};

export type SavedNotesOption = {
  subjectId: string;
  subjectName: string;
  preview: string;
  updatedAt: string;
};

/** Fixed batch size for each Groq flashcard generation call. */
export const FLASHCARDS_PER_GENERATION = 5;
