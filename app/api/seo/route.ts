import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { computeSeoScore } from '@/lib/seo-score';
import { buildSchemaJson } from '@/lib/seo-schema';
import { DEFAULT_SEO_SETTINGS, type ProjectSeoSettings } from '@/lib/seo-types';
import { canSaveSeoSettings } from '@/lib/tier-config';

function rowToSettings(row: Record<string, unknown> | null): ProjectSeoSettings {
  if (!row) return { ...DEFAULT_SEO_SETTINGS };
  return {
    title: String(row.title ?? ''),
    metaDescription: String(row.meta_description ?? ''),
    focusKeyword: String(row.focus_keyword ?? ''),
    canonicalUrl: String(row.canonical_url ?? ''),
    ogTitle: String(row.og_title ?? ''),
    ogDescription: String(row.og_description ?? ''),
    ogImageUrl: String(row.og_image_url ?? ''),
    schemaType: (row.schema_type as ProjectSeoSettings['schemaType']) || 'saas',
    schemaJson: (row.schema_json as Record<string, unknown>) || null,
    noindex: Boolean(row.noindex),
    sitemapEnabled: row.sitemap_enabled !== false,
    robotsEnabled: row.robots_enabled !== false,
    seoScore: Number(row.seo_score ?? 0),
  };
}

function settingsToRow(projectId: string, settings: ProjectSeoSettings) {
  const score = computeSeoScore(settings).total;
  return {
    project_id: projectId,
    title: settings.title,
    meta_description: settings.metaDescription,
    focus_keyword: settings.focusKeyword,
    canonical_url: settings.canonicalUrl,
    og_title: settings.ogTitle,
    og_description: settings.ogDescription,
    og_image_url: settings.ogImageUrl,
    schema_type: settings.schemaType,
    schema_json: settings.schemaJson,
    noindex: settings.noindex,
    sitemap_enabled: settings.sitemapEnabled,
    robots_enabled: settings.robotsEnabled,
    seo_score: score,
    updated_at: new Date().toISOString(),
  };
}

async function assertProjectOwner(
  supabase: Awaited<ReturnType<typeof getAuthenticatedProfile>>['supabase'],
  userId: string,
  projectId: string
) {
  const { data } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const project = await assertProjectOwner(supabase, user.id, projectId);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('project_seo')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ seo: rowToSettings(data) });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tier = profile?.subscription_tier ?? 'free';
  const status = profile?.subscription_status ?? 'inactive';

  if (!canSaveSeoSettings(tier, status)) {
    return NextResponse.json(
      { error: 'Saving SEO settings requires an active Pro plan or above.', upgrade: true },
      { status: 403 }
    );
  }

  const body = await request.json();
  const projectId = body.projectId as string;
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const project = await assertProjectOwner(supabase, user.id, projectId);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const settings: ProjectSeoSettings = {
    ...DEFAULT_SEO_SETTINGS,
    ...body.seo,
  };

  if (!settings.schemaJson && settings.title) {
    settings.schemaJson = buildSchemaJson(settings.schemaType, {
      name: settings.title,
      description: settings.metaDescription,
      url: settings.canonicalUrl,
      image: settings.ogImageUrl,
    });
  }

  const row = settingsToRow(projectId, settings);

  const { data, error } = await supabase
    .from('project_seo')
    .upsert(row, { onConflict: 'project_id' })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ seo: rowToSettings(data) });
}
