/**
 * Evidence: SuperEduc8 Checkout branding_settings.display_name.
 * Creates + expires a live session (no charge).
 */
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';
import { SE8_STRIPE_PRICE_IDS } from '../lib/se8-stripe-price-ids';

function loadEnv() {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const price = SE8_STRIPE_PRICE_IDS.studentMonthly;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price, quantity: 1 }],
    success_url: 'https://www.supereduc8.com/billing?checkout=success',
    cancel_url: 'https://www.supereduc8.com/billing?checkout=canceled',
    customer_email: `se8.brand.evidence.${Date.now()}@students.niskbuild.com`,
    branding_settings: {
      display_name: 'SuperEduc8',
      button_color: '#e05a25',
    },
    metadata: { source: 'supereduc8', probe: 'branding-evidence' },
    subscription_data: {
      metadata: { source: 'supereduc8', probe: 'branding-evidence' },
    },
  });

  const branding = (session as { branding_settings?: { display_name?: string } })
    .branding_settings;
  console.log('session_id', session.id);
  console.log('branding_settings', JSON.stringify(branding));

  const product = await stripe.products.retrieve(
    (await stripe.prices.retrieve(price)).product as string
  );
  console.log('product.name', product.name);
  console.log('product.statement_descriptor', product.statement_descriptor);

  if (branding?.display_name !== 'SuperEduc8') {
    throw new Error(`Expected display_name SuperEduc8, got ${branding?.display_name}`);
  }
  if (product.statement_descriptor !== 'SUPEREDUC8') {
    throw new Error(
      `Expected product statement_descriptor SUPEREDUC8, got ${product.statement_descriptor}`
    );
  }

  await stripe.checkout.sessions.expire(session.id);
  console.log('PASS se8 stripe branding (Checkout display_name + product descriptor)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
