import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { getProjectLimit } from '@/lib/project-limits';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCanUseOrg, userOrgIds } from '@/lib/organization-team';

const PROJECT_SELECT =
  'id, title, prompt, generated_code, files_json, project_context, org_id, user_id, created_at, project_seo(seo_score)';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { user } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const orgIds = await userOrgIds(user.id);

  // Personal projects (org_id null) owned by user + org-scoped projects for orgs they belong to
  const { data: personal, error: personalErr } = await admin
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('user_id', user.id)
    .is('org_id', null)
    .order('created_at', { ascending: false });

  if (personalErr) {
    return NextResponse.json({ error: personalErr.message }, { status: 500 });
  }

  let orgProjects: typeof personal = [];
  if (orgIds.length > 0) {
    const { data, error: orgErr } = await admin
      .from('projects')
      .select(PROJECT_SELECT)
      .in('org_id', orgIds)
      .order('created_at', { ascending: false });
    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }
    orgProjects = data ?? [];
  }

  const byId = new Map<string, (typeof personal extends (infer T)[] | null ? T : never)>();
  for (const row of [...(personal ?? []), ...orgProjects]) {
    byId.set(row.id as string, row);
  }
  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
  );

  const projects = merged.map((row) => {
    const seoRow = Array.isArray(row.project_seo) ? row.project_seo[0] : row.project_seo;
    const { project_seo: _seo, ...project } = row;
    return {
      ...project,
      seo_score: seoRow?.seo_score ?? null,
    };
  });

  const projectIds = projects.map((p) => p.id as string);
  const versionMap: Record<string, number> = {};
  if (projectIds.length > 0) {
    const { data: versionRows, error: versionError } = await admin
      .from('project_versions')
      .select('project_id, version_number')
      .in('project_id', projectIds);

    if (!versionError) {
      for (const row of versionRows ?? []) {
        const current = versionMap[row.project_id] ?? 0;
        if (row.version_number > current) versionMap[row.project_id] = row.version_number;
      }
    }
  }

  const withVersions = projects.map((p) => ({
    ...p,
    latest_version: versionMap[p.id as string] ?? 0,
  }));

  const { listOrganizationsForUser } = await import('@/lib/organizations');
  const orgs = await listOrganizationsForUser(user.id);

  return NextResponse.json({
    projects: withVersions,
    orgs: orgs.map((o) => ({ id: o.id, name: o.name, role: o.role })),
  });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { user, profile } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, prompt, generated_code, project_context, files_json, org_id: orgIdRaw } = body;
  if (!title?.trim() || !generated_code) {
    return NextResponse.json({ error: 'Title and code are required' }, { status: 400 });
  }

  const orgId =
    typeof orgIdRaw === 'string' && orgIdRaw.trim() ? orgIdRaw.trim() : null;
  if (orgId) {
    try {
      await assertCanUseOrg(user.id, orgId);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Not a team member' },
        { status: 403 }
      );
    }
  }

  const admin = createAdminClient();

  let tier: string;
  let count: number;
  let limit: number;

  if (orgId) {
    // Team project: org-wide quota from billing owner's plan
    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .select('billing_owner_id')
      .eq('id', orgId)
      .maybeSingle();
    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }
    if (!org?.billing_owner_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { data: ownerProfile, error: ownerErr } = await admin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', org.billing_owner_id)
      .maybeSingle();
    if (ownerErr) {
      return NextResponse.json({ error: ownerErr.message }, { status: 500 });
    }

    tier = (ownerProfile?.subscription_tier as string) || 'free';
    limit = getProjectLimit(tier);

    const { count: orgCount, error: countError } = await admin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    count = orgCount ?? 0;
  } else {
    // Personal project: creator's own tier, only personal (org_id null) projects
    tier = profile?.subscription_tier ?? 'free';
    limit = getProjectLimit(tier);

    const { count: personalCount, error: countError } = await admin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('org_id', null);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    count = personalCount ?? 0;
  }

  if (count >= limit) {
    const sandboxMsg =
      !orgId && tier === 'free'
        ? 'Free tier limited to 1 project. Upgrade to Pro.'
        : orgId
          ? `Team project limit reached (${count}/${limit} on the team's ${tier} plan).`
          : `Project limit reached (${limit} on ${tier} plan). Upgrade to save more.`;
    return NextResponse.json(
      {
        error: sandboxMsg,
        limit,
        count,
        upgrade: !orgId && tier === 'free',
        scope: orgId ? 'org' : 'personal',
      },
      { status: 403 }
    );
  }

  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    title: title.trim(),
    prompt: prompt || '',
    generated_code,
    org_id: orgId,
  };
  if (project_context != null) {
    insertRow.project_context = project_context;
  }
  if (files_json != null && typeof files_json === 'object') {
    insertRow.files_json = files_json;
  }

  const { data, error } = await admin
    .from('projects')
    .insert(insertRow)
    .select('id, title, prompt, generated_code, files_json, project_context, org_id, user_id, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

export async function PATCH(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { user } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const projectId = typeof body.id === 'string' ? body.id : '';
  const action = body.action as string;

  if (!projectId) {
    return NextResponse.json({ error: 'Project id required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: project, error: findErr } = await admin
    .from('projects')
    .select('id, user_id, org_id')
    .eq('id', projectId)
    .maybeSingle();

  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  if (action === 'move_to_team') {
    const orgId = typeof body.orgId === 'string' ? body.orgId : '';
    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }
    // Only the personal owner can move a personal project into a team they belong to
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the project owner can move it to a team.' }, { status: 403 });
    }
    if (project.org_id) {
      return NextResponse.json({ error: 'This project is already on a team.' }, { status: 400 });
    }
    try {
      await assertCanUseOrg(user.id, orgId);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Not a team member' },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from('projects')
      .update({ org_id: orgId })
      .eq('id', projectId)
      .select('id, title, org_id, user_id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data });
  }

  if (action === 'make_personal') {
    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the project creator can move it back to personal.' },
        { status: 403 }
      );
    }
    if (!project.org_id) {
      return NextResponse.json({ error: 'Already personal.' }, { status: 400 });
    }
    try {
      await assertCanUseOrg(user.id, project.org_id as string);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Not a team member' },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from('projects')
      .update({ org_id: null })
      .eq('id', projectId)
      .select('id, title, org_id, user_id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { user } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Project id required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from('projects')
    .select('id, user_id, org_id')
    .eq('id', id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (project.user_id === user.id) {
    const { error } = await admin.from('projects').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Org owner/admin can delete org projects they did not create
  if (project.org_id) {
    const { getMembership } = await import('@/lib/organization-team');
    const membership = await getMembership(project.org_id as string, user.id);
    if (membership && (membership.role === 'owner' || membership.role === 'admin')) {
      const { error } = await admin.from('projects').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ error: 'Not allowed to delete this project' }, { status: 403 });
}
