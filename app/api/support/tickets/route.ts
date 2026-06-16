import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canUseSupportTickets } from '@/lib/support-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupportTicket, notifyAdminNewTicket } from '@/lib/support-tickets';

const VALID_CATEGORIES = new Set(['general', 'billing', 'technical', 'feature', 'bug']);

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user } = await getAuthenticatedProfile();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, priority, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  const { user, profile } = await getAuthenticatedProfile();
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tier = profile?.subscription_tier ?? 'free';
  const status = profile?.subscription_status ?? 'inactive';

  if (!canUseSupportTickets(tier, status)) {
    return NextResponse.json(
      {
        error: 'Priority support tickets require an active Pro Worker plan or above. Use the contact form instead.',
        upgrade: true,
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const category =
      typeof body.category === 'string' && VALID_CATEGORIES.has(body.category)
        ? body.category
        : 'technical';
    const name =
      typeof profile?.full_name === 'string' && profile.full_name.trim()
        ? profile.full_name.trim()
        : user.email.split('@')[0];

    if (!subject || subject.length < 3) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 });
    }

    const admin = createAdminClient();
    const ticket = await createSupportTicket(admin, {
      userId: user.id,
      email: user.email,
      name,
      subject,
      category,
      message,
      planTier: tier,
      source: 'support_portal',
      priority: tier === 'agency' || tier === 'scale' || tier === 'white_label' ? 'high' : 'normal',
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }

    void notifyAdminNewTicket({
      ticketId: ticket.id,
      subject,
      name,
      email: user.email,
      category,
      message,
      planTier: tier,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to create ticket');
  }
}
