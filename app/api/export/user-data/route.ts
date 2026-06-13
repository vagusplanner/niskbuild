import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const userId = guard.user!.id;
  const supabase = createAdminClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, prompt, created_at, project_context, blueprint_json')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const projectIds = (projects || []).map((p) => p.id);
  let seoRows: unknown[] = [];
  if (projectIds.length > 0) {
    const { data: seo } = await supabase
      .from('project_seo')
      .select('project_id, title, meta_description, focus_keyword, seo_score, updated_at')
      .in('project_id', projectIds);
    seoRows = seo || [];
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, subscription_tier, created_at')
    .eq('id', userId)
    .single();

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    account: {
      email: profile?.email,
      fullName: profile?.full_name,
      tier: profile?.subscription_tier,
    },
    projects: (projects || []).map((p) => ({
      id: p.id,
      title: p.title,
      prompt: p.prompt,
      created_at: p.created_at,
      project_context: p.project_context,
      blueprint_json: p.blueprint_json,
    })),
    seo: seoRows || [],
    note: 'Generated code is excluded — export individual projects as ZIP from the Builder.',
  };

  const zip = new JSZip();
  zip.file('niskbuild-user-data.json', JSON.stringify(exportPayload, null, 2));
  zip.file(
    'README.txt',
    `NiskBuild data export\nGenerated: ${exportPayload.exportedAt}\nProjects: ${exportPayload.projects.length}\n`
  );

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const data = new Uint8Array(buffer);

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="niskbuild-data-export-${Date.now()}.zip"`,
    },
  });
}
