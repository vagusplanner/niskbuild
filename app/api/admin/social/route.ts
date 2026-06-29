import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiErrorResponse } from '@/lib/api-error';
import { SOCIAL_PHASES, WEEKLY_REVIEW_RULES, ugcPercentageForWeek } from '@/lib/social-hub/content-plan';
import { SOCIAL_THEME_BANK } from '@/lib/social-hub/theme-bank';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const admin = createAdminClient();
    const firstparty = admin.schema('firstparty');

    const [{ data: config }, { data: connections }, { data: posts }] = await Promise.all([
      firstparty.from('social_hub_config').select('*').eq('id', 'default').maybeSingle(),
      firstparty.from('buffer_tokens').select('user_id, buffer_profile_id, updated_at'),
      firstparty
        .from('social_posts')
        .select('id, user_id, platform, body, status, scheduled_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const userIds = [
      ...new Set([
        ...(connections ?? []).map((c) => c.user_id as string),
        ...(posts ?? []).map((p) => p.user_id as string),
      ]),
    ];

    const emailByUser = new Map<string, string>();
    if (userIds.length) {
      const { data: profiles } = await admin.from('profiles').select('id, email').in('id', userIds);
      for (const p of profiles ?? []) {
        emailByUser.set(p.id as string, p.email as string);
      }
    }

    const week = (config?.current_week as number) ?? 1;

    return NextResponse.json({
      config: config ?? {
        id: 'default',
        current_phase: 0,
        current_week: 1,
        ugc_percentage: 25,
        active_theme_ids: [],
        weekly_review_notes: null,
      },
      suggestedUgc: ugcPercentageForWeek(week),
      phases: SOCIAL_PHASES,
      weeklyReviewRules: WEEKLY_REVIEW_RULES,
      themeBank: SOCIAL_THEME_BANK,
      connections: (connections ?? []).map((row) => ({
        userId: row.user_id,
        email: emailByUser.get(row.user_id as string) ?? '',
        bufferProfileId: row.buffer_profile_id,
        updatedAt: row.updated_at,
      })),
      posts: (posts ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        email: emailByUser.get(row.user_id as string) ?? '',
        platform: row.platform,
        body: row.body,
        status: row.status,
        scheduledAt: row.scheduled_at,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load Social Hub');
  }
}

export async function PATCH(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const body = (await request.json()) as {
      currentPhase?: number;
      currentWeek?: number;
      ugcPercentage?: number;
      activeThemeIds?: string[];
      weeklyReviewNotes?: string;
    };

    const admin = createAdminClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.currentPhase != null) updates.current_phase = body.currentPhase;
    if (body.currentWeek != null) updates.current_week = body.currentWeek;
    if (body.ugcPercentage != null) updates.ugc_percentage = body.ugcPercentage;
    if (body.activeThemeIds != null) updates.active_theme_ids = body.activeThemeIds;
    if (body.weeklyReviewNotes != null) updates.weekly_review_notes = body.weeklyReviewNotes;

    const { data, error } = await admin
      .schema('firstparty')
      .from('social_hub_config')
      .update(updates)
      .eq('id', 'default')
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update Social Hub config');
  }
}
