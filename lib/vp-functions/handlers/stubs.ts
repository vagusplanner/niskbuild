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
