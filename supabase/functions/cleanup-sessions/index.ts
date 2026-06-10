import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const INACTIVE_HOURS = 24;

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), { status: 500 });
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const staleBefore = new Date(Date.now() - INACTIVE_HOURS * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: removed, error: sessionError } = await supabase
    .from('active_sessions')
    .delete()
    .lt('last_active', staleBefore)
    .select('id');

  await supabase.from('pending_session_approvals').delete().lt('expires_at', now);

  if (sessionError) {
    return new Response(JSON.stringify({ error: sessionError.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      removed_sessions: removed?.length ?? 0,
      stale_before: staleBefore,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
