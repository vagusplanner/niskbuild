import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupportTicket, notifyAdminNewTicket } from '@/lib/support-tickets';

const VALID_CATEGORIES = new Set(['general', 'billing', 'technical', 'sales', 'feature', 'bug']);

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { requireAuth: false, rateLimit: 8 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const category =
      typeof body.category === 'string' && VALID_CATEGORIES.has(body.category)
        ? body.category
        : 'general';

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter your name' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 });
    }
    if (!subject || subject.length < 3) {
      return NextResponse.json({ error: 'Please enter a subject' }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const ticket = await createSupportTicket(supabase, {
      userId: guard.user?.id ?? null,
      email,
      name,
      subject,
      category,
      message,
      source: 'contact_form',
      planTier: null,
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Could not submit your message' }, { status: 500 });
    }

    void notifyAdminNewTicket({
      ticketId: ticket.id,
      subject,
      name,
      email,
      category,
      message,
    });

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: 'Thanks — we received your message and will reply soon.',
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to send message');
  }
}
