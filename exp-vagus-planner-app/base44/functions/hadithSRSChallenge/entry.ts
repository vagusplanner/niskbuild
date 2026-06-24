import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// SM-2 spaced repetition algorithm
function sm2(quality, repetitions, easeFactor, interval) {
  // quality: 0-5 (0=blackout, 3=hesitant but correct, 5=perfect)
  const q = Math.min(5, Math.max(0, quality));
  let newInterval, newRepetitions, newEaseFactor;

  if (q < 3) {
    // Failed — reset
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    newRepetitions = repetitions + 1;
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newEaseFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    dueDate: dueDate.toISOString().split('T')[0],
    status: newRepetitions === 0 ? 'learning' : newInterval > 21 ? 'mastered' : 'review'
  };
}

const HADITH_COLLECTIONS = {
  bukhari: { name: 'Sahih al-Bukhari', max: 7563 },
  muslim: { name: 'Sahih Muslim', max: 7470 },
  abudawud: { name: 'Sunan Abu Dawud', max: 5274 },
  tirmidhi: { name: 'Jami al-Tirmidhi', max: 3956 },
  nasai: { name: "Sunan an-Nasa'i", max: 5761 },
  ibnmajah: { name: 'Sunan Ibn Majah', max: 4341 },
};

async function fetchHadith(collection, number) {
  try {
    const url = `https://api.sunnah.com/v1/hadiths/${collection}:${number}`;
    const res = await fetch(url, {
      headers: { 'X-API-Key': 'SqD12345', 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (_) {}

  // Fallback: use hadith-api.com
  try {
    const url = `https://random-hadith-generator.vercel.app/${collection}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (_) {}

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── GET DAILY CHALLENGES ──────────────────────────────────────
    if (action === 'get_daily') {
      const today = new Date().toISOString().split('T')[0];
      const allCards = await base44.entities.HadithSRS.filter({ created_by: user.email }).catch(() => []);

      // Cards due today or overdue
      const due = allCards.filter(c => !c.due_date || c.due_date <= today);

      // New cards to introduce (max 5 per day)
      const newCards = allCards.filter(c => c.status === 'new').slice(0, 5);

      // Today's challenge: due + new (max 20)
      const daily = [...due, ...newCards].slice(0, 20);

      // Stats
      const mastered = allCards.filter(c => c.status === 'mastered').length;
      const learning = allCards.filter(c => c.status === 'learning' || c.status === 'review').length;
      const streak = calculateStreak(allCards);

      return Response.json({
        daily,
        stats: {
          total: allCards.length,
          due: due.length,
          mastered,
          learning,
          streak,
          new: allCards.filter(c => c.status === 'new').length,
        }
      });
    }

    // ── REVIEW A CARD ─────────────────────────────────────────────
    if (action === 'review') {
      const { card_id, quality } = body; // quality 0-5
      const card = await base44.entities.HadithSRS.filter({ id: card_id, created_by: user.email }).then(r => r[0]).catch(() => null);
      if (!card) return Response.json({ error: 'Card not found' }, { status: 404 });

      const result = sm2(quality, card.repetitions || 0, card.ease_factor || 2.5, card.interval_days || 1);

      await base44.entities.HadithSRS.update(card_id, {
        ease_factor: result.easeFactor,
        interval_days: result.interval,
        repetitions: result.repetitions,
        due_date: result.dueDate,
        last_reviewed: new Date().toISOString().split('T')[0],
        quality_last: quality,
        status: result.status,
      });

      return Response.json({ success: true, next_review: result.dueDate, interval: result.interval, status: result.status });
    }

    // ── ADD HADITH TO DECK ────────────────────────────────────────
    if (action === 'add_hadith') {
      const { collection, hadith_text, hadith_arabic, hadith_number, hadith_narrator, hadith_chapter } = body;
      const today = new Date().toISOString().split('T')[0];

      const card = await base44.entities.HadithSRS.create({
        hadith_collection: collection || 'bukhari',
        hadith_number: hadith_number || 1,
        hadith_text,
        hadith_arabic: hadith_arabic || '',
        hadith_narrator: hadith_narrator || '',
        hadith_chapter: hadith_chapter || '',
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        due_date: today,
        status: 'new',
      });

      return Response.json({ card });
    }

    // ── GENERATE AI CHALLENGE ─────────────────────────────────────
    if (action === 'ai_challenge') {
      const { hadith_text, hadith_narrator } = body;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a quiz question to help memorize this Hadith:
Narrator: ${hadith_narrator || 'Unknown'}
Text: "${hadith_text}"

Create ONE multiple-choice question (4 options) that tests understanding or key details. The correct answer should require actually knowing the hadith.`,
        response_json_schema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            correct_index: { type: 'number' },
            explanation: { type: 'string' }
          }
        }
      });
      return Response.json(result);
    }

    // ── GET COLLECTION HADITHS TO BROWSE ─────────────────────────
    if (action === 'get_collection') {
      const { collection = 'bukhari', page = 1 } = body;
      const limit = 10;
      const skip = (page - 1) * limit;

      // Use the hadith-api.com API
      let hadiths = [];
      try {
        const res = await fetch(`https://api.hadith.gading.dev/books/${collection}?range=${skip + 1}-${skip + limit}`);
        if (res.ok) {
          const data = await res.json();
          hadiths = data?.data?.hadiths || [];
        }
      } catch (_) {}

      const maxHadiths = HADITH_COLLECTIONS[collection]?.max || 1000;

      return Response.json({
        hadiths,
        collection,
        collectionName: HADITH_COLLECTIONS[collection]?.name || collection,
        page,
        hasMore: skip + limit < maxHadiths,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('hadithSRS error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateStreak(cards) {
  if (!cards.length) return 0;
  const reviewedDates = [...new Set(cards.filter(c => c.last_reviewed).map(c => c.last_reviewed))].sort().reverse();
  if (!reviewedDates.length) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < reviewedDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (reviewedDates[i] === expectedStr) streak++;
    else break;
  }
  return streak;
}