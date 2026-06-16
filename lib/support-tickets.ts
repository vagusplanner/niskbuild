import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/send-email';
import { getAdminEmail } from '@/lib/admin-auth';

export type CreateTicketInput = {
  userId?: string | null;
  email: string;
  name: string;
  subject: string;
  category: string;
  message: string;
  planTier?: string | null;
  source: string;
  priority?: string;
};

export async function createSupportTicket(
  supabase: SupabaseClient,
  input: CreateTicketInput
): Promise<{ id: string } | null> {
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: input.userId || null,
      email: input.email,
      name: input.name,
      subject: input.subject,
      category: input.category,
      plan_tier: input.planTier || null,
      source: input.source,
      priority: input.priority || 'normal',
      status: 'open',
    })
    .select('id')
    .single();

  if (error || !ticket) return null;

  await supabase.from('support_messages').insert({
    ticket_id: ticket.id,
    sender_type: 'user',
    sender_email: input.email,
    body: input.message,
  });

  return { id: ticket.id };
}

export async function notifyAdminNewTicket(params: {
  ticketId: string;
  subject: string;
  name: string;
  email: string;
  category: string;
  message: string;
  planTier?: string | null;
}): Promise<void> {
  const adminEmail = getAdminEmail();
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;color:#111;">
      <h2 style="margin:0 0 12px;">New support ticket</h2>
      <p><strong>Subject:</strong> ${escapeHtml(params.subject)}</p>
      <p><strong>From:</strong> ${escapeHtml(params.name)} &lt;${escapeHtml(params.email)}&gt;</p>
      <p><strong>Category:</strong> ${escapeHtml(params.category)}</p>
      ${params.planTier ? `<p><strong>Plan:</strong> ${escapeHtml(params.planTier)}</p>` : ''}
      <p><strong>Ticket ID:</strong> ${escapeHtml(params.ticketId)}</p>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="white-space:pre-wrap;line-height:1.5;">${escapeHtml(params.message)}</p>
      <p style="margin-top:20px;font-size:12px;color:#666;">Reply from the NiskBuild admin support panel.</p>
    </div>
  `;

  void sendEmail({
    to: adminEmail,
    subject: `[NiskBuild] ${params.subject}`,
    html,
    replyTo: params.email,
  });
}

export async function notifyUserTicketReply(params: {
  to: string;
  userName: string;
  subject: string;
  replyBody: string;
  ticketId: string;
  discountPercent?: number;
  discountNote?: string | null;
}): Promise<void> {
  const discountBlock =
    params.discountPercent && params.discountPercent > 0
      ? `<div style="margin:20px 0;padding:16px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
          <p style="margin:0;font-weight:600;color:#065f46;">🎁 ${params.discountPercent}% discount applied to your account</p>
          ${params.discountNote ? `<p style="margin:8px 0 0;color:#047857;font-size:14px;">${escapeHtml(params.discountNote)}</p>` : ''}
          <p style="margin:8px 0 0;color:#047857;font-size:13px;">Your next checkout will include this discount automatically.</p>
        </div>`
      : '';

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;color:#1e293b;">
      <h2 style="margin:0 0 12px;color:#4F6EF7;">Reply from NiskBuild Support</h2>
      <p style="color:#64748b;font-size:14px;">Re: <strong>${escapeHtml(params.subject)}</strong></p>
      ${discountBlock}
      <div style="margin:20px 0;padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid #4F6EF7;">
        <p style="margin:0;white-space:pre-wrap;line-height:1.6;">${escapeHtml(params.replyBody)}</p>
      </div>
      <p style="font-size:13px;color:#64748b;">You can view the full conversation in your NiskBuild dashboard under Support.</p>
      <p style="font-size:12px;color:#94a3b8;margin-top:24px;">Ticket ref: ${escapeHtml(params.ticketId.slice(0, 8))}</p>
    </div>
  `;

  await sendEmail({
    to: params.to,
    subject: `Re: ${params.subject} — NiskBuild Support`,
    html,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
