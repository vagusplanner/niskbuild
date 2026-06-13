export type StripeInjectConfig = {
  paymentType: 'one-time' | 'subscription';
  productName: string;
  price: string;
  currency: string;
  publishableKey: string;
};

export function buildStripeInjectSystemPrompt(config: StripeInjectConfig): string {
  const mode =
    config.paymentType === 'subscription'
      ? `add a SubscriptionButton that creates a Stripe subscription for "${config.productName}" at ${config.price} ${config.currency} per billing period`
      : `add a PaymentButton component that opens Stripe Checkout for "${config.productName}" at ${config.price} ${config.currency}`;

  return `You are a Stripe integration expert. Inject a complete Stripe payment flow into this existing web app.
For this project: ${mode}.
Use Stripe.js loaded from https://js.stripe.com/v3/ with publishable key: ${config.publishableKey}.
Include success and cancel redirect handling. Show a payment success state after completion.
Return ONLY the complete modified HTML document (or full app code) with Stripe fully integrated. No markdown fences. No explanations.`;
}
