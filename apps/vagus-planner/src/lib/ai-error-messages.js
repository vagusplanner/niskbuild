export const AI_TIMEOUT_USER_MESSAGE =
  'AI is taking longer than usual — please try again';

/** Map InvokeLLM / AI API errors to user-facing copy; surface timeouts distinctly. */
export function aiFailureMessage(error, fallback) {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (message.toLowerCase().includes('timed out')) {
    return AI_TIMEOUT_USER_MESSAGE;
  }
  return fallback;
}
