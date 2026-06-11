import 'server-only';

import { getGroqClient } from '@/lib/groq-client';

export const PLAN_SYSTEM_PROMPT = `You are a senior software architect. The user wants a technical implementation roadmap BEFORE any code is written.

Output ONLY valid Markdown. No code fences around the whole document. Structure:

## Project Overview
(1-2 sentences)

## Data Schema
(Tables, fields, relationships — or "N/A static frontend")

## File Structure
(Bullet list of files to create/update)

## User Flows
(Step-by-step UX paths)

## Implementation Phases
(Numbered phases with concrete tasks)

## Risks & Dependencies
(What could block delivery)

Be specific to the user's request. Do NOT generate HTML or code.`;

export async function generateArchitecturePlan(prompt: string): Promise<{
  success: boolean;
  plan?: string;
  error?: string;
}> {
  const groq = getGroqClient();
  if (!groq) {
    return { success: false, error: 'Plan mode requires Groq API key' };
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: PLAN_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Create an architectural roadmap for:\n\n${prompt}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 2048,
    });

    const plan = completion.choices[0]?.message?.content?.trim();
    if (!plan) {
      return { success: false, error: 'Empty plan response' };
    }

    return { success: true, plan };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Plan generation failed';
    return { success: false, error: msg };
  }
}
