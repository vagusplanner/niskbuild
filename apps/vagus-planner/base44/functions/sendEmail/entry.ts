/**
 * Shared Resend email sender for Vagus Planner
 * All emails sent from support@vagusplanner.com or team@vagusplanner.com
 * 
 * Usage: invoke via base44.functions.invoke('sendEmail', { to, subject, html, from_address, from_name })
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

export async function sendResendEmail({ to, subject, html, from_address = 'support@vagusplanner.com', from_name = 'Vagus Planner' }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${from_name} <${from_address}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    throw new Error(`Resend failed: ${err}`);
  }

  return await res.json();
}

// Also expose as a callable backend function
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can call this directly
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { to, subject, html, from_address, from_name } = await req.json();

    if (!to || !subject || !html) {
      return Response.json({ error: 'to, subject, html are required' }, { status: 400 });
    }

    const result = await sendResendEmail({ to, subject, html, from_address, from_name });
    return Response.json({ success: true, id: result.id });

  } catch (error) {
    console.error('sendEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});