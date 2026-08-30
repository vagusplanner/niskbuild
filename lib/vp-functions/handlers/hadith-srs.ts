import {
  parseGroqJsonContent,
} from '@/lib/shift-ai/groq-json';
import { vpChatCompletionJson } from '@/lib/vp-ai-providers';
import { aiUnavailableMessage } from '@/lib/vp-gdpr/art9-ai-gate';
import { createClient } from '@/lib/supabase/server';
import { gateFeatureWithArt9 } from './calendar-ai';
import type { VpFunctionHandler } from '../types';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateYmd(date: Date): string {
  return date.toISOString().split('T')[0];
}

function subDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

type HadithCard = {
  id: string;
  user_id: string;
  hadith_text: string;
  hadith_arabic: string | null;
  hadith_narrator: string | null;
  hadith_chapter: string | null;
  hadith_collection: string;
  hadith_number: number | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  status: string;
  next_review_at: string;
  last_reviewed_at: string | null;
};

function mapCard(row: HadithCard) {
  return {
    id: row.id,
    hadith_text: row.hadith_text,
    hadith_arabic: row.hadith_arabic,
    hadith_narrator: row.hadith_narrator,
    hadith_chapter: row.hadith_chapter,
    hadith_collection: row.hadith_collection,
    hadith_number: row.hadith_number,
    status: row.status,
  };
}

function applySm2(
  card: Pick<HadithCard, 'ease_factor' | 'interval_days' | 'repetitions' | 'status'>,
  quality: number
) {
  let ease_factor = card.ease_factor;
  let interval_days = card.interval_days;
  let repetitions = card.repetitions;
  let status = card.status;

  ease_factor = Math.max(
    1.3,
    ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (quality < 3) {
    repetitions = 0;
    interval_days = 1;
    status = 'learning';
  } else {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.max(1, Math.round(interval_days * ease_factor));
    repetitions += 1;
    status = repetitions >= 3 ? 'review' : 'learning';
    if (interval_days >= 21) status = 'mastered';
  }

  const next_review_at = addDays(new Date(), interval_days).toISOString();
  return { ease_factor, interval_days, repetitions, status, next_review_at };
}

async function updateStreak(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: settings } = await supabase
    .schema('firstparty')
    .from('vp_user_settings')
    .select('id, preferences')
    .eq('user_id', userId)
    .maybeSingle();

  const prefs = (settings?.preferences as Record<string, unknown>) ?? {};
  const today = formatDateYmd(new Date());
  const yesterday = formatDateYmd(subDays(new Date(), 1));
  const lastDate = typeof prefs.hadith_srs_last_review_date === 'string' ? prefs.hadith_srs_last_review_date : null;

  let streak = typeof prefs.hadith_srs_streak === 'number' ? prefs.hadith_srs_streak : 0;
  if (lastDate !== today) {
    streak = lastDate === yesterday ? streak + 1 : 1;
  }

  const nextPrefs = {
    ...prefs,
    hadith_srs_streak: streak,
    hadith_srs_last_review_date: today,
  };

  if (settings?.id) {
    await supabase
      .schema('firstparty')
      .from('vp_user_settings')
      .update({ preferences: nextPrefs, updated_at: new Date().toISOString() })
      .eq('id', settings.id);
  } else {
    await supabase.schema('firstparty').from('vp_user_settings').insert({
      user_id: userId,
      preferences: nextPrefs,
    });
  }

  return streak;
}

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const now = new Date().toISOString();
  const { data: cards } = await supabase
    .schema('firstparty')
    .from('vp_hadith_srs_cards')
    .select('id, status, next_review_at')
    .eq('user_id', userId);

  const all = cards ?? [];
  const due = all.filter((c) => c.next_review_at <= now).length;
  const mastered = all.filter((c) => c.status === 'mastered').length;
  const total = all.length;

  const { data: settings } = await supabase
    .schema('firstparty')
    .from('vp_user_settings')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();

  const prefs = (settings?.preferences as Record<string, unknown>) ?? {};
  const streak = typeof prefs.hadith_srs_streak === 'number' ? prefs.hadith_srs_streak : 0;

  return { streak, due, mastered, total };
}

export const hadithSRSChallenge: VpFunctionHandler = async ({ user, payload }) => {
  const action = typeof payload.action === 'string' ? payload.action : 'get_daily';
  const supabase = await createClient();

  if (action === 'get_daily') {
    const now = new Date().toISOString();
    const { data: dueCards, error } = await supabase
      .schema('firstparty')
      .from('vp_hadith_srs_cards')
      .select('*')
      .eq('user_id', user.id)
      .lte('next_review_at', now)
      .order('next_review_at', { ascending: true })
      .limit(20);

    if (error) {
      return { ok: false, error: 'Failed to load daily cards', status: 500 };
    }

    const stats = await getStats(supabase, user.id);
    return {
      ok: true,
      data: {
        stats,
        daily: (dueCards ?? []).map((c) => mapCard(c as HadithCard)),
      },
    };
  }

  if (action === 'add_hadith') {
    const hadith_text = typeof payload.hadith_text === 'string' ? payload.hadith_text.trim() : '';
    if (!hadith_text) {
      return { ok: false, error: 'hadith_text is required', status: 400 };
    }

    const collection =
      typeof payload.collection === 'string' ? payload.collection : 'bukhari';

    const { data: inserted, error } = await supabase
      .schema('firstparty')
      .from('vp_hadith_srs_cards')
      .insert({
        user_id: user.id,
        hadith_text,
        hadith_arabic:
          typeof payload.hadith_arabic === 'string' ? payload.hadith_arabic : null,
        hadith_narrator:
          typeof payload.hadith_narrator === 'string' ? payload.hadith_narrator : null,
        hadith_chapter:
          typeof payload.hadith_chapter === 'string' ? payload.hadith_chapter : null,
        hadith_collection: collection,
        hadith_number:
          typeof payload.hadith_number === 'number' ? payload.hadith_number : null,
        status: 'new',
        next_review_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !inserted) {
      return { ok: false, error: 'Failed to add hadith', status: 500 };
    }

    return { ok: true, data: { card: mapCard(inserted as HadithCard) } };
  }

  if (action === 'review') {
    const cardId = typeof payload.card_id === 'string' ? payload.card_id : '';
    const quality = typeof payload.quality === 'number' ? payload.quality : 3;

    if (!cardId) {
      return { ok: false, error: 'card_id is required', status: 400 };
    }

    const { data: card, error: fetchErr } = await supabase
      .schema('firstparty')
      .from('vp_hadith_srs_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', cardId)
      .maybeSingle();

    if (fetchErr || !card) {
      return { ok: false, error: 'Card not found', status: 404 };
    }

    const sm2 = applySm2(card as HadithCard, quality);
    const { error: updateErr } = await supabase
      .schema('firstparty')
      .from('vp_hadith_srs_cards')
      .update({
        ...sm2,
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .eq('user_id', user.id);

    if (updateErr) {
      return { ok: false, error: 'Failed to save review', status: 500 };
    }

    await updateStreak(supabase, user.id);
    return { ok: true, data: { reviewed: true, ...sm2 } };
  }

  if (action === 'ai_challenge') {
    const gate = await gateFeatureWithArt9(user, 'ai_requests', ['religious']);
    if (!gate.ok) return gate.result;

    const hadith_text =
      typeof payload.hadith_text === 'string' ? payload.hadith_text.trim() : '';
    const hadith_narrator =
      typeof payload.hadith_narrator === 'string' ? payload.hadith_narrator : 'Unknown';

    if (!hadith_text) {
      return { ok: false, error: 'hadith_text is required', status: 400 };
    }

    const prompt = `Create a multiple-choice quiz question about this hadith.
Narrator: ${hadith_narrator}
Hadith: ${hadith_text}

Return JSON: {"question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}`;

    const aiResult = await vpChatCompletionJson(
      'You create Islamic knowledge quiz questions. Be accurate and respectful.',
      prompt,
      {
        userTier: gate.plan,
        label: 'vp-hadith-srs-quiz',
        temperature: 0.5,
        art9Categories: gate.art9Categories,
      }
    );

    if (!aiResult.ok) {
      return {
        ok: false,
        error: aiUnavailableMessage(gate.art9Categories),
        status: 503,
      };
    }

    const parsed = parseGroqJsonContent(aiResult.content, 'Could not parse quiz response');
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, status: 502 };
    }

    const quiz = parsed.json as Record<string, unknown>;
    return {
      ok: true,
      data: {
        question: quiz.question,
        options: quiz.options,
        correct_index: quiz.correct_index,
        explanation: quiz.explanation,
      },
    };
  }

  return { ok: false, error: `Unknown action: ${action}`, status: 400 };
};
