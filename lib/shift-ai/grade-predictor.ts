import 'server-only';

import { aggregateGradeSignals } from '@/lib/shift-ai/analytics';
import type { GradePredictionResult } from '@/lib/shift-ai/grade-predictor-shared';
import { curriculumLabel } from '@/lib/shift-ai/subjects';
import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';
import { createAdminClient } from '@/lib/supabase/admin';

export async function generateGradePrediction(input: {
  studentId: string;
  subject: string;
  yearGroup: string;
  curriculum: string;
}): Promise<{ ok: true; prediction: GradePredictionResult } | { ok: false; error: string }> {
  const signals = await aggregateGradeSignals(input.studentId, input.subject);

  if (
    signals.masteryTotal === 0 &&
    signals.quizSessions === 0 &&
    signals.flashcardTotal === 0 &&
    signals.plannerTotal === 0
  ) {
    return {
      ok: false,
      error: 'Not enough study data yet — use Mastery Map, Quiz Arcade, or Flashcards first',
    };
  }

  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Grade Predictor is temporarily unavailable' };
  }

  const curriculumName = curriculumLabel(input.curriculum);
  const prompt = `You are an expert ${curriculumName} exam coach predicting a likely grade for a ${input.yearGroup} student in ${input.subject}.

REAL aggregated study signals (use these exactly — do not invent data):
- Mastery: ${signals.masteryPercent}% mastered (${signals.masteredCount}/${signals.masteryTotal} topics)
- Quiz Arcade avg score: ${signals.avgQuizScorePercent ?? 'no quiz data yet'}% (${signals.quizSessions} recent sessions)
- Flashcard retention: ${signals.flashcardRetentionPercent ?? 'no flashcard data yet'}% (${signals.flashcardRetained}/${signals.flashcardTotal} cards with 3+ reviews)
- Planner completion: ${signals.plannerCompletionPercent}% (${signals.plannerCompleted}/${signals.plannerTotal} tasks)
- Weak topics: ${signals.weakTopics.map((t) => t.topic).join(', ') || 'none tracked yet'}

Return JSON:
{
  "predicted_grade": "grade label e.g. 7, B, Mention",
  "confidence": 0.0-1.0,
  "priority_topics": ["topic1", "topic2", "topic3"],
  "improvement_plan": "2-3 sentence actionable plan referencing the signals above"
}

Be transparent and realistic. ${GROQ_JSON_ONLY_INSTRUCTION}`;

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: SHIFT_GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You give honest, curriculum-aligned grade predictions based only on provided signals.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = parseGroqJsonContent(raw, 'Could not parse grade prediction');
    if (!parsed.ok) {
      logGroqParseFailure('grade predictor', raw, parsed.error);
      return { ok: false, error: parsed.error };
    }

    const data = parsed.json as Record<string, unknown>;
    const predicted_grade =
      typeof data.predicted_grade === 'string' ? data.predicted_grade.trim() : '';
    const confidence =
      typeof data.confidence === 'number'
        ? data.confidence
        : Number(data.confidence) || 0.5;
    const priority_topics = Array.isArray(data.priority_topics)
      ? data.priority_topics.filter((t): t is string => typeof t === 'string')
      : signals.weakTopics.map((t) => t.topic).slice(0, 3);
    const improvement_plan =
      typeof data.improvement_plan === 'string'
        ? data.improvement_plan.trim()
        : 'Keep building mastery and reviewing weak topics.';

    if (!predicted_grade) {
      return { ok: false, error: 'Grade prediction returned incomplete data' };
    }

    const prediction: GradePredictionResult = {
      predicted_grade,
      confidence: Math.min(1, Math.max(0, confidence)),
      priority_topics: priority_topics.slice(0, 3),
      improvement_plan,
      signals,
    };

    const admin = createAdminClient();
    await admin.schema('firstparty').from('shift_grade_predictions').insert({
      student_id: input.studentId,
      subject: input.subject,
      predicted_grade,
      confidence: prediction.confidence,
      factors: prediction,
    });

    return { ok: true, prediction };
  } catch (error) {
    console.error('Grade predictor error:', error);
    return { ok: false, error: 'Grade Predictor is temporarily unavailable' };
  }
}
