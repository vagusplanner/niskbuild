import type { VpFunctionHandler } from '../types';

/** Fire-and-forget analytics — accepted and discarded until a pipeline exists. */
export const trackAnalytics: VpFunctionHandler = async () => ({
  ok: true,
  data: { logged: true },
});

/** Welcome email hook — no-op until email template is wired. */
export const onNewUserWelcome: VpFunctionHandler = async () => ({
  ok: true,
  data: { sent: false, skipped: true },
});

/** Event/calendar AI summary placeholder — avoids 501; full LLM summary is a follow-up. */
export const aiEventSummary: VpFunctionHandler = async ({ payload }) => {
  const eventData =
    payload.event_data && typeof payload.event_data === 'object'
      ? (payload.event_data as Record<string, unknown>)
      : {};
  const title = typeof eventData.title === 'string' ? eventData.title : 'this event';

  return {
    ok: true,
    data: {
      success: true,
      summary: {
        overview: `Summary for "${title}" is not available yet.`,
        suggestions: [],
      },
    },
  };
};
