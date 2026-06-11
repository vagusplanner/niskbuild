import 'server-only';

import Groq from 'groq-sdk';

let groqClient: Groq | null = null;

/** Lazy Groq client — avoids build-time failure when GROQ_API_KEY is unset on Vercel. */
export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}
