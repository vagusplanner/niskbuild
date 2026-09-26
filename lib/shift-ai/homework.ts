import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import { GROQ_VISION_MODEL } from '@/lib/groq-vision';
import { withLanguageInstruction, type ShiftStudyLanguage } from '@/lib/shift-ai/study-language';

const HOMEWORK_SECTION_STRUCTURE = `Structure the response with ASCII markdown headings so each section can be parsed. Use exactly this heading form (hash + space + title), even if the title and body are not English:

# Summary
# Step-by-step guidance
# Key concepts
# Check your work

Heading markers must stay ASCII "#" (or the ASCII pattern "1. Title:" with a Latin capital letter after the number). Do not use Arabic-Indic numerals (١ ٢ ٣) or unmarked paragraphs as section structure. Human-readable heading titles and all body text may be Arabic.`;

export function buildHomeworkVisionPrompt(
  yearGroup: string,
  language?: ShiftStudyLanguage
): string {
  const base = `This is a student's homework. Help them understand and solve it step by step. Do not just give the final answer — guide them through the reasoning, appropriate for a ${yearGroup} student. If you cannot read the image clearly, say so.

${HOMEWORK_SECTION_STRUCTURE}`;

  const prompted = withLanguageInstruction(base, language);
  if (language !== 'ar') return prompted;

  return `${prompted}

Even when writing Arabic, keep section structure as ASCII markdown headings: a "#" character, a space, then the title. Example:
# الملخص
(Arabic body)
# الإرشاد خطوة بخطوة
(Arabic body)
Do not replace "#" with Arabic punctuation or use ١. / ٢. as section headings.`;
}

export type VisionAnalyzeResult =
  | { ok: true; text: string }
  | {
      ok: false;
      code: 'VISION_UNAVAILABLE' | 'VISION_MODEL_ERROR' | 'VISION_EMPTY';
      error: string;
    };

/** Build a data URL so Groq does not need to fetch a private/signed storage URL. */
export function homeworkImageDataUrl(
  buffer: Buffer,
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): string {
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

export async function analyzeHomeworkPhoto(
  imageUrlOrDataUrl: string,
  yearGroup: string,
  language?: ShiftStudyLanguage
): Promise<string | null> {
  const result = await analyzeHomeworkPhotoDetailed(imageUrlOrDataUrl, yearGroup, language);
  return result.ok ? result.text : null;
}

export async function analyzeHomeworkPhotoDetailed(
  imageUrlOrDataUrl: string,
  yearGroup: string,
  language?: ShiftStudyLanguage
): Promise<VisionAnalyzeResult> {
  return analyzeImageWithVision(buildHomeworkVisionPrompt(yearGroup, language), imageUrlOrDataUrl, {
    system: withLanguageInstruction(
      'You are a patient, encouraging tutor helping a student learn from a homework photo. Be clear, age-appropriate, and pedagogical. Always split the reply with ASCII markdown headings (# Title) even when the rest of the reply is Arabic.',
      language
    ),
  });
}

export async function transcribeEssayPhoto(imageUrl: string): Promise<string | null> {
  const result = await analyzeImageWithVision(
    `Transcribe all handwritten or printed essay text from this image. Preserve paragraph breaks with blank lines. Return only the essay text — no commentary. If you cannot read the image clearly, return a single sentence explaining what is unclear.`,
    imageUrl,
    {
      system:
        'You extract text from student essay photos accurately. Output plain text only.',
      temperature: 0.2,
      maxTokens: 4096,
    }
  );
  return result.ok ? result.text : null;
}

async function analyzeImageWithVision(
  prompt: string,
  imageUrl: string,
  options: { system: string; temperature?: number; maxTokens?: number }
): Promise<VisionAnalyzeResult> {
  const groq = getGroqClient();
  if (!groq) {
    return {
      ok: false,
      code: 'VISION_UNAVAILABLE',
      error: 'Vision AI is not configured (missing GROQ_API_KEY).',
    };
  }

  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: imageUrl } },
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: userContent },
      ],
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 4096,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '';
    if (!text) {
      return {
        ok: false,
        code: 'VISION_EMPTY',
        error: 'Vision model returned an empty response for this photo.',
      };
    }
    return { ok: true, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Shift AI vision error:', message, error);
    const modelGone = /model_not_found|does not exist|do not have access/i.test(message);
    return {
      ok: false,
      code: 'VISION_MODEL_ERROR',
      error: modelGone
        ? `Vision model unavailable (${GROQ_VISION_MODEL}). ${message}`
        : `Vision model failed: ${message}`,
    };
  }
}
