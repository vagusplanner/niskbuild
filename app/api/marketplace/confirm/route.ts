import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const user = guard.user!;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    if (session.metadata?.type !== 'template' || session.metadata.userId !== user.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 403 });
    }

    const templateId = session.metadata.templateId;
    if (!templateId) {
      return NextResponse.json({ error: 'Missing template' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('purchased_templates')
      .eq('id', user.id)
      .single();

    const existing: string[] = Array.isArray(profile?.purchased_templates)
      ? profile.purchased_templates
      : [];

    if (!existing.includes(templateId)) {
      await supabase
        .from('profiles')
        .update({ purchased_templates: [...existing, templateId] })
        .eq('id', user.id);
    }

    return NextResponse.json({ success: true, templateId });
  } catch (error) {
    console.error('Template confirm error:', error);
    return NextResponse.json({ error: 'Failed to confirm purchase' }, { status: 500 });
  }
}
