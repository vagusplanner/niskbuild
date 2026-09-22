/**
 * Groq production model IDs — used as emergency fallback when DeepSeek is unset,
 * and for narration / truncation continue helpers.
 *
 * Primary cloud generate default is DeepSeek V4.1 Flash (`lib/generation-models.ts`).
 *
 * llama-3.3-70b-versatile and llama-3.1-8b-instant shut down 2026-08-16
 * (free/developer tier). See https://console.groq.com/docs/deprecations
 */
export const GROQ_CODE_MODEL = 'openai/gpt-oss-120b';

/** Cheap/fast model for narration and similar short streams. */
export const GROQ_FAST_MODEL = 'openai/gpt-oss-20b';
