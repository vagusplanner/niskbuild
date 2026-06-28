import 'server-only';

import { getGroqClient } from '@/lib/groq-client';

/** Groq multimodal model — replacement for deprecated llama-3.2-*-vision-preview models. */
export const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const FIGMA_SCREENSHOT_SYSTEM_PROMPT = `You are looking at a UI design screenshot. Describe the layout, components, color palette, and structure precisely, then generate code matching this design as closely as possible, using the existing project's tech stack conventions.

For this step, output ONLY a detailed design specification (no HTML/CSS/JS). Cover:
- Page structure and sections (header, hero, sidebar, footer, etc.)
- Every visible UI component and its hierarchy
- Color palette (name colors and approximate hex values)
- Typography (sizes, weights, alignment)
- Spacing, borders, shadows, and corner radii
- Interactive elements (buttons, links, inputs, tabs, cards)
- Imagery and icon placement

Write in clear prose a developer can follow to recreate the design in a single-file HTML app with Tailwind CSS.`;

export async function analyzeFigmaScreenshot(
  imageUrl: string,
  userContext?: string
): Promise<string | null> {
  const groq = getGroqClient();
  if (!groq) return null;

  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [
    {
      type: 'text',
      text: userContext?.trim()
        ? `Additional builder context from the user:\n${userContext.trim()}`
        : 'Analyze this Figma screenshot export and describe the design in full detail.',
    },
    { type: 'image_url', image_url: { url: imageUrl } },
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: 'system', content: FIGMA_SCREENSHOT_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    });

    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Groq vision error:', error);
    return null;
  }
}

export function buildFigmaScreenshotPrompt(
  designDescription: string,
  userPrompt: string,
  figmaReferenceLink?: string | null
): string {
  const parts = [
    'Build a complete, responsive web application that matches this UI design from a Figma screenshot export.',
    `Design specification (from screenshot analysis):\n${designDescription}`,
  ];

  if (figmaReferenceLink?.trim()) {
    parts.push(
      `Figma frame reference link (stored for context only — not fetched):\n${figmaReferenceLink.trim()}`
    );
  }

  if (userPrompt.trim()) {
    parts.push(`Additional instructions from the user:\n${userPrompt.trim()}`);
  }

  parts.push(
    'Use a single HTML file with embedded CSS/JS. Prefer Tailwind CSS via CDN. Match layout, colors, and component structure as closely as possible.'
  );

  return parts.join('\n\n');
}
