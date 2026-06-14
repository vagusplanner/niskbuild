import type { SupabaseClient } from '@supabase/supabase-js';
import { getVersionLimit } from '@/lib/version-limits';

export type ProjectVersionRow = {
  id: string;
  project_id: string;
  version_number: number;
  blueprint_json: unknown;
  generated_code: string;
  prompt_used: string;
  credits_used: number;
  created_at: string;
};

export async function getNextVersionNumber(
  supabase: SupabaseClient,
  projectId: string
): Promise<number> {
  const { data } = await supabase
    .from('project_versions')
    .select('version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.version_number ?? 0) + 1;
}

export async function pruneProjectVersions(
  supabase: SupabaseClient,
  projectId: string,
  tier: string
): Promise<void> {
  const limit = getVersionLimit(tier);
  if (limit === null) return;

  const { data: rows } = await supabase
    .from('project_versions')
    .select('id, version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false });

  if (!rows || rows.length <= limit) return;

  const toDelete = rows.slice(limit).map((r) => r.id);
  await supabase.from('project_versions').delete().in('id', toDelete);
}

export async function insertProjectVersion(
  supabase: SupabaseClient,
  params: {
    projectId: string;
    tier: string;
    blueprint_json?: unknown;
    generated_code: string;
    prompt_used: string;
    credits_used: number;
  }
): Promise<ProjectVersionRow | null> {
  const versionNumber = await getNextVersionNumber(supabase, params.projectId);

  const { data, error } = await supabase
    .from('project_versions')
    .insert({
      project_id: params.projectId,
      version_number: versionNumber,
      blueprint_json: params.blueprint_json ?? null,
      generated_code: params.generated_code,
      prompt_used: params.prompt_used,
      credits_used: params.credits_used,
    })
    .select('*')
    .single();

  if (error || !data) return null;

  await pruneProjectVersions(supabase, params.projectId, params.tier);
  return data as ProjectVersionRow;
}
