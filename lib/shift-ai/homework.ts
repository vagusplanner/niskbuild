import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import { GROQ_VISION_MODEL } from '@/lib/groq-vision';

export function buildHomeworkVisionPrompt(yearGroup: string): string {
  return `This is a student's homework. Help them understand and solve it step by step. Do not just give the final answer — guide them through the reasoning, appropriate for a ${yearGroup} student. If you cannot read the image clearly, say so.

Structure your response as:
1. A brief summary of the problem(s) you see
2. Numbered step-by-step guidance (at least 3 steps when possible)
3. Key concepts to remember
4. Only at the end, a short "Check your work" section — not a bare final answer dump.`;
}

export async function analyzeHomeworkPhoto(
  imageUrl: string,
  yearGroup: string
): Promise<string | null> {
  return analyzeImageWithVision(buildHomeworkVisionPrompt(yearGroup), imageUrl, {
    system:
      'You are a patient, encouraging tutor helping a student learn from a homework photo. Be clear, age-appropriate, and pedagogical.',
  });
}

export async function transcribeEssayPhoto(imageUrl: string): Promise<string | null> {
  return analyzeImageWithVision(
    `Transcribe all handwritten or printed essay text from this image. Preserve paragraph breaks with blank lines. Return only the essay text — no commentary. If you cannot read the image clearly, return a single sentence explaining what is unclear.`,
    imageUrl,
    {
      system:
        'You extract text from student essay photos accurately. Output plain text only.',
      temperature: 0.2,
      maxTokens: 4096,
    }
  );
}

async function analyzeImageWithVision(
  prompt: string,
  imageUrl: string,
  options: { system: string; temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const groq = getGroqClient();
  if (!groq) return null;

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

    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Shift AI vision error:', error);
    return null;
  }
}
