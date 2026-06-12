import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { getTemplateById, canAccessTemplate } from '@/lib/marketplace-templates';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.price === 0) {
      return NextResponse.json({ error: 'This template is free' }, { status: 400 });
    }

    const supabase = await createClient();
    const user = guard.user!;

    if (!user.email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, purchased_templates')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier || 'free';
    const purchasedIds = Array.isArray(profile?.purchased_templates)
      ? profile.purchased_templates
      : [];

    if (canAccessTemplate(template, tier, purchasedIds)) {
      return NextResponse.json({ alreadyOwned: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: template.price * 100,
            product_data: {
              name: `NiskBuild Template: ${template.name}`,
              description: template.description.slice(0, 200),
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/marketplace?purchased=${templateId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/marketplace?canceled=true`,
      metadata: {
        type: 'template',
        templateId: template.id,
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to start checkout');
  }
}
