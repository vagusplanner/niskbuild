/**
 * Client helper — start SuperEduc8 Stripe Checkout and redirect.
 */

export type Se8CheckoutPlan = 'student' | 'family';
export type Se8CheckoutInterval = 'month' | 'year';

export type StartSe8CheckoutInput = {
  plan?: Se8CheckoutPlan;
  interval?: Se8CheckoutInterval;
  childQuantity?: number;
  successUrl?: string;
  cancelUrl?: string;
};

export type StartSe8CheckoutResult =
  | { ok: true; sessionUrl: string; sessionId: string }
  | { ok: false; error: string; status: number };

export async function startSe8Checkout(
  input: StartSe8CheckoutInput = {}
): Promise<StartSe8CheckoutResult> {
  const res = await fetch('/api/shift-ai/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      plan: input.plan ?? 'student',
      interval: input.interval ?? 'month',
      childQuantity: input.childQuantity ?? 0,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    sessionUrl?: string;
    sessionId?: string;
  };

  if (!res.ok || !data.sessionUrl) {
    return {
      ok: false,
      error: data.error || 'Could not start checkout',
      status: res.status,
    };
  }

  return {
    ok: true,
    sessionUrl: data.sessionUrl,
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
  };
}

export function isShiftPremiumRequiredResponse(
  status: number,
  body?: { code?: string } | null
): boolean {
  return status === 402 || body?.code === 'SHIFT_PREMIUM_REQUIRED';
}
