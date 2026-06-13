import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const user = guard.user!;

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ payments: [] });
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
    });

    const payments = invoices.data.map((inv) => ({
      id: inv.id,
      date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      amount: (inv.amount_paid || 0) / 100,
      currency: (inv.currency || 'usd').toUpperCase(),
      status: inv.status || 'unknown',
      plan: inv.lines?.data?.[0]?.description || 'NiskBuild subscription',
      invoiceUrl: inv.hosted_invoice_url || inv.invoice_pdf || null,
    }));

    return NextResponse.json({ payments });
  } catch {
    return NextResponse.json({ payments: [], error: 'Could not load billing history' });
  }
}
