import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getAdminEmail } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/send-email';
import { createAdminClient } from '@/lib/supabase/admin';

const HIGH_PRIORITY_TIERS = new Set(['sovereign', 'team_enterprise']);

type HistoryMessage = {
  role: string;
  content: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseHistory(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (m): m is HistoryMessage =>
        !!m &&
        typeof m === 'object' &&
        typeof (m as HistoryMessage).role === 'string' &&
        typeof (m as HistoryMessage).content === 'string'
    )
    .slice(-12)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }));
}

function supportInbox(): string {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    getAdminEmail()
  );
}

function buildEscalationEmailHtml(params: {
  userName: string;
  userEmail: string;
  userTier: string;
  priority: 'high' | 'normal';
  message: string;
  conversationHistory: HistoryMessage[];
}): string {
  const isHigh = params.priority === 'high';
  const historyHtml =
    params.conversationHistory.length > 0
      ? `
            <div style="margin:16px 0;">
              <p style="font-weight:600;margin-bottom:8px;color:#0F172A;">Conversation history</p>
              ${params.conversationHistory
                .map((msg) => {
                  const isUser = msg.role === 'user';
                  const accent = isUser ? '#0284C7' : '#046A38';
                  return `
                <div style="background:#E8EEF4;border-radius:6px;padding:8px 12px;margin:4px 0;border-left:3px solid ${accent};">
                  <strong style="font-size:11px;color:${accent};">${isUser ? 'User' : 'AI'}:</strong>
                  <span style="font-size:13px;color:#2D3748;"> ${escapeHtml(msg.content)}</span>
                </div>`;
                })
                .join('')}
            </div>`
      : '';

  return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:system-ui,sans-serif;background:linear-gradient(135deg,#D9E2EC,#BCCCDC);color:#0F172A;padding:20px;margin:0;">
        <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:30px;border:1px solid rgba(15,23,42,0.1);">
          <h1 style="margin:0 0 16px;color:#046A38;font-size:22px;">AI agent escalation</h1>
          <p><strong>User:</strong> ${escapeHtml(params.userName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(params.userEmail || 'Not provided')}</p>
          <p><strong>Tier:</strong> ${escapeHtml(params.userTier)}</p>
          <p><strong>Priority:</strong>
            <span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;margin-left:6px;background:${isHigh ? '#0F172A' : '#046A38'};color:#FFFFFF;">
              ${isHigh ? 'High' : 'Normal'}
            </span>
          </p>
          <div style="background:#E8EEF4;border-radius:8px;padding:16px;border:1px solid rgba(15,23,42,0.08);margin:16px 0;">
            <p style="font-weight:600;margin:0 0 8px;color:#0F172A;">User question</p>
            <p style="margin:0;white-space:pre-wrap;line-height:1.5;color:#2D3748;">${escapeHtml(params.message)}</p>
          </div>
          ${historyHtml}
          <p style="font-size:12px;color:#4A5568;margin-top:20px;">Reply to this email to respond to the user.</p>
          <div style="margin-top:20px;color:#4A5568;font-size:12px;border-top:1px solid rgba(15,23,42,0.1);padding-top:16px;">
            <p style="margin:0;">NiskBuild Support — <a href="https://www.niskbuild.com" style="color:#0284C7;">niskbuild.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 6 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const conversationHistory = parseHistory(body.conversationHistory);
    const bodyEmail =
      typeof body.userEmail === 'string' ? body.userEmail.trim().toLowerCase() : '';

    if (!message || message.length < 5) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const user = guard.user;
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to escalate to support' }, { status: 401 });
    }

    const supabase = createAdminClient();

    let userTier = 'sandbox';
    let userName = 'User';
    let userEmail = bodyEmail || user.email || '';

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      userTier = profile.subscription_tier || 'sandbox';
      userName = profile.full_name || profile.email || user.email || 'User';
      userEmail = userEmail || profile.email || user.email || '';
    }

    const priority = HIGH_PRIORITY_TIERS.has(userTier) ? 'high' : 'normal';

    const { data: escalation, error: insertError } = await supabase
      .from('agent_escalations')
      .insert({
        user_id: user.id,
        user_email: userEmail || null,
        message,
        conversation_history: conversationHistory,
        status: 'pending',
        priority,
      })
      .select('id')
      .single();

    if (insertError || !escalation) {
      console.error('agent_escalations insert:', insertError);
      return NextResponse.json({ error: 'Could not save escalation' }, { status: 500 });
    }

    const html = buildEscalationEmailHtml({
      userName,
      userEmail,
      userTier,
      priority,
      message,
      conversationHistory,
    });

    const sent = await sendEmail({
      to: supportInbox(),
      subject: `AI escalation: ${userName} (${userTier})`,
      html,
      replyTo: userEmail || undefined,
    });

    if (sent) {
      await supabase
        .from('agent_escalations')
        .update({ email_sent: true })
        .eq('id', escalation.id);
    }

    return NextResponse.json({
      success: true,
      escalationId: escalation.id,
      emailSent: sent,
      message:
        'Your request has been escalated to our support team. We will respond within 24 hours.',
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to escalate request');
  }
}
