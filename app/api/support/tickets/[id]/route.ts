import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user } = await getAuthenticatedProfile();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, priority, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const { data: messages } = await supabase
    .from('support_messages')
    .select('id, sender_type, sender_email, body, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ ticket, messages: messages ?? [] });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 15 });
  if (!guard.ok) return guard.response;

  const { user } = await getAuthenticatedProfile();
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const { message } = await request.json();

  if (!message?.trim() || message.trim().length < 2) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from('support_tickets')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  if (ticket.status === 'closed') {
    return NextResponse.json({ error: 'This ticket is closed' }, { status: 400 });
  }

  await admin.from('support_messages').insert({
    ticket_id: id,
    sender_type: 'user',
    sender_email: user.email,
    body: message.trim(),
  });

  await admin
    .from('support_tickets')
    .update({ status: 'open', updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
