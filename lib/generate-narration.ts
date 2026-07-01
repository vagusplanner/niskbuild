import 'server-only';

import { getGroqClient } from '@/lib/groq-client';

const HTML_NARRATION_SYSTEM = `You are NiskBuild's build assistant. The user asked for a web app change.
Write a live status update in plain English — 4–8 short lines max.
Describe what you are building: layout, pages, components, styling, interactions.
Use present tense ("I'm setting up…", "Adding…"). Be specific to their request.
NO code, NO HTML, NO markdown fences, NO bullet symbols — just clear sentences, one per line.`;

const VP_NARRATION_SYSTEM = `You are NiskBuild's Vagus Planner editor assistant.
The user asked to edit a React app page. Write 4–6 short plain-English lines explaining what you will change.
Mention UI, features, navigation, or logic — specific to their request.
NO code, NO JSX, NO markdown — one sentence per line, present tense.`;

export type NarrationContext = 'html' | 'vp';

export async function streamBuildNarration(
  userPrompt: string,
  context: NarrationContext,
  onDelta: (accumulated: string, delta: string) => void,
  extraContext?: string
): Promise<string> {
  const groq = getGroqClient();
  if (!groq) {
    const fallback =
      context === 'html'
        ? 'Understanding your request…\nPlanning the page structure…\nPreparing layout and styles…'
        : 'Reading the current page…\nPlanning your edits…\nApplying changes to the app…';
    onDelta(fallback, fallback);
    return fallback;
  }

  const system = context === 'html' ? HTML_NARRATION_SYSTEM : VP_NARRATION_SYSTEM;
  const userContent = extraContext
    ? `${userPrompt.trim()}\n\nContext: ${extraContext}`
    : userPrompt.trim();

  const stream = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.5,
    max_tokens: 350,
    stream: true,
  });

  let accumulated = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (!delta) continue;
    accumulated += delta;
    onDelta(accumulated, delta);
  }

  return accumulated.trim();
}
