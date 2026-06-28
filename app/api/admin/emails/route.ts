import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiErrorResponse } from '@/lib/api-error';
import {
  EMAIL_TEMPLATE_CATALOG,
  catalogEntryForKey,
  renderTemplateHtml,
} from '@/lib/email/template-registry';
import { sendLifecycleEmail } from '@/lib/email/send-log';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const admin = createAdminClient();
    const emailFilter = request.nextUrl.searchParams.get('email')?.trim().toLowerCase();
    const userId = request.nextUrl.searchParams.get('userId')?.trim();
    const templateKey = request.nextUrl.searchParams.get('template')?.trim();
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50), 200);

    let profileIds: string[] | null = null;
    if (emailFilter) {
      const { data: matched } = await admin
        .from('profiles')
        .select('id')
        .ilike('email', emailFilter);
      profileIds = (matched ?? []).map((p) => p.id as string);
      if (profileIds.length === 0) {
        return NextResponse.json({ sends: [], templates: EMAIL_TEMPLATE_CATALOG });
      }
    }

    let query = admin
      .from('email_sends')
      .select('id, user_id, template_key, subject, sent_at, opened_at, clicked_at, source, resend_id')
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (userId) query = query.eq('user_id', userId);
    if (profileIds) query = query.in('user_id', profileIds);
    if (templateKey) query = query.eq('template_key', templateKey);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const userIds = [...new Set(rows.map((r) => r.user_id as string))];
    const emailByUser = new Map<string, string>();

    if (userIds.length) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      for (const p of profiles ?? []) {
        emailByUser.set(p.id as string, p.email as string);
      }
    }

    const sends = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: emailByUser.get(row.user_id as string) ?? '',
      templateKey: row.template_key,
      subject: row.subject,
      sentAt: row.sent_at,
      openedAt: row.opened_at,
      clickedAt: row.clicked_at,
      source: row.source,
      resendId: row.resend_id,
    }));

    return NextResponse.json({ sends, templates: EMAIL_TEMPLATE_CATALOG });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load email sends');
  }
}

export async function POST(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const templateKey = typeof body.templateKey === 'string' ? body.templateKey : '';
    const customSubject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const customHtml = typeof body.html === 'string' ? body.html.trim() : '';
    const force = body.force !== false;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const to = profile?.email;
    if (!to) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    let subject = customSubject;
    let html = customHtml;

    if (!html && templateKey) {
      const rendered = renderTemplateHtml(templateKey);
      if (!rendered) {
        return NextResponse.json({ error: 'Unknown template key' }, { status: 400 });
      }
      subject = subject || rendered.subject;
      html = rendered.html;
    }

    if (!subject || !html) {
      return NextResponse.json(
        { error: 'Provide templateKey or both subject and html' },
        { status: 400 }
      );
    }

    const entry = catalogEntryForKey(templateKey);
    const logKey = templateKey || `admin_custom_${Date.now()}`;

    const result = await sendLifecycleEmail({
      userId,
      to,
      templateKey: logKey,
      subject,
      html,
      force,
      source: 'admin',
      htmlSnapshot: html,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? 'Send failed — check Resend configuration' },
        { status: result.error?.includes('already sent') ? 409 : 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      templateKey: logKey,
      subject,
      label: entry?.label ?? 'Custom email',
      warning: result.logWarning ?? null,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to send email');
  }
}
