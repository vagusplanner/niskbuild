import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { getAdminEmail } from '@/lib/admin-auth';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyUserTicketReply } from '@/lib/support-tickets';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const ownerGuard = await requirePlatformOwner(request);
  if (!ownerGuard.ok) return ownerGuard.response;

  const { id } = await context.params;
  const supabase = createAdminClient();

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: messages } = await supabase
    .from('support_messages')
    .select('id, sender_type, sender_email, body, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  let userDiscount = null;
  if (ticket.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'id, email, subscription_tier, admin_discount_percent, admin_discount_note, admin_discount_applied_at'
      )
      .eq('id', ticket.user_id)
      .maybeSingle();
    userDiscount = profile;
  }

  return NextResponse.json({ ticket, messages: messages ?? [], user: userDiscount });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const ownerGuard = await requirePlatformOwner(request);
  if (!ownerGuard.ok) return ownerGuard.response;

  const { id } = await context.params;
  const body = await request.json();
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === 'string') updates.status = body.status;
  if (typeof body.priority === 'string') updates.priority = body.priority;

  const { error } = await supabase.from('support_tickets').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const ownerGuard = await requirePlatformOwner(request);
  if (!ownerGuard.ok) return ownerGuard.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const reply = typeof body.reply === 'string' ? body.reply.trim() : '';
    const discountPercent =
      typeof body.discountPercent === 'number'
        ? Math.min(100, Math.max(0, Math.round(body.discountPercent)))
        : 0;
    const discountNote = typeof body.discountNote === 'string' ? body.discountNote.trim() : '';
    const newStatus = typeof body.status === 'string' ? body.status : 'in_progress';

    if (!reply || reply.length < 2) {
      return NextResponse.json({ error: 'Reply message is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const adminEmail = getAdminEmail();

    await supabase.from('support_messages').insert({
      ticket_id: id,
      sender_type: 'admin',
      sender_email: adminEmail,
      body: reply,
    });

    await supabase
      .from('support_tickets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    let appliedDiscount = 0;
    if (ticket.user_id && discountPercent > 0) {
      await supabase
        .from('profiles')
        .update({
          admin_discount_percent: discountPercent,
          admin_discount_note: discountNote || null,
          admin_discount_applied_at: new Date().toISOString(),
          admin_discount_applied_by: adminEmail,
        })
        .eq('id', ticket.user_id);
      appliedDiscount = discountPercent;
    }

    await notifyUserTicketReply({
      to: ticket.email,
      userName: ticket.name || 'there',
      subject: ticket.subject,
      replyBody: reply,
      ticketId: id,
      discountPercent: appliedDiscount,
      discountNote: discountNote || null,
    });

    if (appliedDiscount > 0) {
      await supabase.from('support_messages').insert({
        ticket_id: id,
        sender_type: 'system',
        body: `Admin applied a ${appliedDiscount}% discount${discountNote ? `: ${discountNote}` : ''}.`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to send reply');
  }
}
