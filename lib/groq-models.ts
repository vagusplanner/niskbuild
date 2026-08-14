/**
 * Groq production model IDs.
 *
 * llama-3.3-70b-versatile and llama-3.1-8b-instant shut down 2026-08-16
 * (free/developer tier). See https://console.groq.com/docs/deprecations
 *
 * Code gen uses GPT-OSS 120B (production, ~500 t/s, 65k max completion) rather
 * than qwen/qwen3.6-27b: Qwen leads SWE-bench, but on Groq it is Preview-only,
 * capped at 16k completion tokens, and slower TTFT — a poor fit for live HTML streaming.
 */
export const GROQ_CODE_MODEL = 'openai/gpt-oss-120b';

/** Cheap/fast model for narration and similar short streams. */
export const GROQ_FAST_MODEL = 'openai/gpt-oss-20b';
