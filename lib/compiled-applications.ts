import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type AppType = 'webapp' | 'mobile' | 'game';

export type ConfigurationState = {
  title?: string;
  html?: string;
  bundle_url?: string;
  theme?: Record<string, string>;
};

export type CompiledApplication = {
  id: string;
  owner_id: string;
  app_type: AppType;
  subdomain_slug: string | null;
  custom_production_domain: string | null;
  configuration_state: ConfigurationState;
  status: string;
  created_at: string;
};

export async function getCompiledApplicationById(
  id: string
): Promise<CompiledApplication | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('compiled_applications')
    .select(
      'id, owner_id, app_type, subdomain_slug, custom_production_domain, configuration_state, status, created_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('compiled_applications load error:', error.message);
    return null;
  }

  return data as CompiledApplication | null;
}

export function runtimeHtmlFromConfig(app: CompiledApplication): string | null {
  const state = app.configuration_state || {};
  if (typeof state.html === 'string' && state.html.trim()) {
    return state.html;
  }
  return null;
}
