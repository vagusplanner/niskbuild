import { NextRequest, NextResponse } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createSupportTicket,
  notifyAdminNewTicket,
} from '@/lib/support-tickets';
import {
  runSupportAgent,
  type SupportAgentMessage,
} from '@/lib/support-agent';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const history: SupportAgentMessage[] = Array.isArray(body.conversationHistory)
      ? body.conversationHistory
          .filter(
            (m: unknown): m is SupportAgentMessage =>
              !!m &&
              typeof m === 'object' &&
              'role' in m &&
              'content' in m &&
              ((m as SupportAgentMessage).role === 'user' ||
                (m as SupportAgentMessage).role === 'assistant')
          )
          .slice(-8)
      : [];

    if (!message || message.length < 2) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email, subscription_tier, subscription_status')
      .eq('id', guard.user.id)
      .maybeSingle();

    const result = await runSupportAgent(
      message,
      {
        userEmail: profile?.email || guard.user.email,
        userName: profile?.full_name || undefined,
        userTier: profile?.subscription_tier || 'free',
        subscriptionStatus: profile?.subscription_status || 'inactive',
      },
      history
    );

    let ticketId: string | undefined;

    if (result.outcome === 'escalated') {
      const ticket = await createSupportTicket(admin, {
        userId: guard.user.id,
        email: profile?.email || guard.user.email || '',
        name: profile?.full_name || 'Member',
        subject: result.escalationSubject || `Support: ${message.slice(0, 60)}`,
        category: 'agent_escalation',
        message: `${message}\n\n---\nAgent summary: ${result.escalationSummary || message}\n\nStatus: Awaiting admin confirmation before account actions.`,
        planTier: profile?.subscription_tier || null,
        source: 'support_agent',
        priority: 'normal',
      });

      if (ticket) {
        ticketId = ticket.id;
        await admin.from('support_messages').insert({
          ticket_id: ticket.id,
          sender_type: 'system',
          sender_email: null,
          body: 'Support agent escalated this thread. Admin must confirm before refunds, tier changes, or account-specific fixes.',
        });

        void notifyAdminNewTicket({
          ticketId: ticket.id,
          subject: result.escalationSubject || message.slice(0, 80),
          name: profile?.full_name || 'Member',
          email: profile?.email || guard.user.email || '',
          category: 'agent_escalation',
          message: result.escalationSummary || message,
          planTier: profile?.subscription_tier,
        });
      }
    }

    return NextResponse.json({
      success: true,
      reply: result.reply,
      outcome: result.outcome,
      ticketId,
      pendingAdmin: result.outcome === 'escalated',
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      {
        error: 'Support agent unavailable',
        reply: 'Please try again or open a ticket manually at /dashboard/support.',
      },
      { status: 500 }
    );
  }
}
