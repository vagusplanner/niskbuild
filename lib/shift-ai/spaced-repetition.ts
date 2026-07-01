/** SM-2 spaced repetition — client-safe (ported from reference spacedRepetition.js). */

export const SM2_QUALITY = {
  again: 0,
  hard: 1,
  good: 3,
  easy: 5,
} as const;

export type Sm2RatingKey = keyof typeof SM2_QUALITY;

export type Sm2CardState = {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string | null;
};

export type ReviewCard = Sm2CardState & {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  subject?: string | null;
  _priority?: number;
  _retention?: number;
};

export function sm2Update(
  card: Pick<Sm2CardState, 'ease_factor' | 'interval_days' | 'repetitions'>,
  quality: number
): Sm2CardState {
  let easeFactor = card.ease_factor ?? 2.5;
  let interval = card.interval_days ?? 1;
  let repetitions = card.repetitions ?? 0;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ease_factor: Math.round(easeFactor * 1000) / 1000,
    interval_days: interval,
    repetitions,
    next_review_at: nextReview.toISOString(),
    last_reviewed_at: new Date().toISOString(),
  };
}

export function retentionEstimate(card: Pick<Sm2CardState, 'interval_days' | 'last_reviewed_at' | 'ease_factor'>): number {
  const { interval_days = 1, last_reviewed_at, ease_factor = 2.5 } = card;
  if (!last_reviewed_at) return 0;

  const daysSince = Math.max(
    0,
    (Date.now() - new Date(last_reviewed_at).getTime()) / 86400000
  );
  const stability = Math.max(1, interval_days * (ease_factor / 2.5));
  const retention = Math.exp(-daysSince / stability);
  return Math.round(retention * 100);
}

function priorityScore(card: ReviewCard): number {
  const retention = retentionEstimate(card);
  const daysOverdue = card.next_review_at
    ? Math.max(0, (Date.now() - new Date(card.next_review_at).getTime()) / 86400000)
    : 999;
  return retention - daysOverdue * 10;
}

export function isCardDue(card: Pick<Sm2CardState, 'next_review_at'>, now = Date.now()): boolean {
  return new Date(card.next_review_at).getTime() <= now;
}

export function buildReviewQueue(allCards: ReviewCard[], maxCards = 30): ReviewCard[] {
  return allCards
    .filter((c) => isCardDue(c))
    .map((c) => ({
      ...c,
      _priority: priorityScore(c),
      _retention: retentionEstimate(c),
    }))
    .sort((a, b) => (a._priority ?? 0) - (b._priority ?? 0))
    .slice(0, maxCards);
}

export function forecastReviews(allCards: Pick<Sm2CardState, 'next_review_at'>[]): Record<string, number> {
  const forecast: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    forecast[d.toISOString().split('T')[0]] = 0;
  }

  allCards.forEach((c) => {
    const key = c.next_review_at.split('T')[0];
    if (forecast[key] !== undefined) {
      forecast[key] += 1;
    }
  });

  return forecast;
}

export function deckStats(cards: ReviewCard[]) {
  const due = cards.filter((c) => isCardDue(c)).length;
  const mature = cards.filter((c) => c.interval_days >= 21).length;
  const avgRetention = cards.length
    ? Math.round(cards.reduce((s, c) => s + retentionEstimate(c), 0) / cards.length)
    : 0;

  return { due, mature, avgRetention, total: cards.length };
}

export const SM2_RATINGS: { key: Sm2RatingKey; label: string; emoji: string; quality: number }[] = [
  { key: 'again', label: 'Again', emoji: '😰', quality: SM2_QUALITY.again },
  { key: 'hard', label: 'Hard', emoji: '😬', quality: SM2_QUALITY.hard },
  { key: 'good', label: 'Good', emoji: '🙂', quality: SM2_QUALITY.good },
  { key: 'easy', label: 'Easy', emoji: '😊', quality: SM2_QUALITY.easy },
];
