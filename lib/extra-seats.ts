/**
 * Extra team seats — informational only (manual sales/support).
 * Do not wire Stripe metered billing or self-serve seat add-ons here.
 */

export const EXTRA_SEAT_MONTHLY_USD = 39;

export const EXTRA_SEAT_CONTACT_EMAIL = 'support@niskbuild.com';

/** Compare / pricing footnote for Agency Studio+ team plans. */
export const EXTRA_SEAT_PRICING_NOTE =
  'Need more seats than included? Additional seats are $39/month each — contact us to add more.';

/** Appended to seat-cap / overage messages in Settings → Team. */
export const EXTRA_SEAT_CONTACT_CTA =
  'Need more seats? Additional seats are $39/month each — contact us to add more.';

export function extraSeatMailtoHref(): string {
  const subject = encodeURIComponent('NiskBuild — additional team seats');
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to add extra team seats ($39/month each) to my organization.\n\nOrg / account email:\nNumber of extra seats needed:\n\nThanks`
  );
  return `mailto:${EXTRA_SEAT_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
