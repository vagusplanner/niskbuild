import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { canViewStripeRevenue } from '@/lib/tier-config';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const userId = guard.user!.id;

  const [{ data: profile }, { data: project }, { data: integration }] = await Promise.all([
    supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single(),
    supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('project_integrations')
      .select('config_json')
      .eq('project_id', projectId)
      .eq('integration_name', 'stripe')
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (!canViewStripeRevenue(profile?.subscription_tier, profile?.subscription_status)) {
    return NextResponse.json(
      { error: 'Agency plan required for Stripe revenue dashboard', upgrade: true },
      { status: 403 }
    );
  }

  const secretKey = (integration?.config_json as { stripe_secret_key?: string } | null)
    ?.stripe_secret_key;

  if (!secretKey?.startsWith('sk_')) {
    return NextResponse.json({
      configured: false,
      message: 'Add your Stripe secret key when connecting Stripe to view live revenue.',
    });
  }

  try {
    const headers = { Authorization: `Bearer ${secretKey}` };
    const [balanceRes, chargesRes] = await Promise.all([
      fetch('https://api.stripe.com/v1/balance', { headers }),
      fetch('https://api.stripe.com/v1/charges?limit=5', { headers }),
    ]);

    if (!balanceRes.ok || !chargesRes.ok) {
      return NextResponse.json({
        configured: true,
        error: 'Could not fetch Stripe data — check your secret key.',
      });
    }

    const balance = await balanceRes.json();
    const charges = await chargesRes.json();

    const available = balance.available?.[0];
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

    const recent = (charges.data || []) as Array<{
      id: string;
      amount: number;
      currency: string;
      created: number;
      paid: boolean;
      description?: string;
    }>;

    const todayRevenue = recent
      .filter((c) => c.paid && c.created >= todayStart)
      .reduce((sum, c) => sum + c.amount, 0);

    const totalRevenue = recent
      .filter((c) => c.paid)
      .reduce((sum, c) => sum + c.amount, 0);

    return NextResponse.json({
      configured: true,
      currency: (available?.currency || recent[0]?.currency || 'gbp').toUpperCase(),
      todayRevenue: todayRevenue / 100,
      totalRevenue: totalRevenue / 100,
      availableBalance: (available?.amount || 0) / 100,
      recentTransactions: recent.map((c) => ({
        id: c.id,
        amount: c.amount / 100,
        currency: c.currency.toUpperCase(),
        description: c.description || 'Payment',
        created: new Date(c.created * 1000).toISOString(),
        paid: c.paid,
      })),
    });
  } catch {
    return NextResponse.json({ configured: true, error: 'Stripe API request failed' }, { status: 502 });
  }
}
