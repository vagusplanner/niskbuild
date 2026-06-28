/**
 * Supabase Edge Function — cron trigger for Vagus Planner reminders.
 *
 * Delegates to the NiskBuild Next.js cron route (APNs + Resend live there).
 * Set secrets: CRON_SECRET, VP_REMINDER_CRON_URL (e.g. https://niskbuild.com/api/cron/vp-send-reminders)
 *
 * Schedule in Supabase Dashboard → Edge Functions → vp-send-reminders → Cron: */5 * * * *
 */

Deno.serve(async () => {
  const cronUrl = Deno.env.get('VP_REMINDER_CRON_URL');
  const secret = Deno.env.get('CRON_SECRET') || Deno.env.get('VP_CRON_SECRET');

  if (!cronUrl || !secret) {
    return new Response(
      JSON.stringify({
        error: 'Missing VP_REMINDER_CRON_URL or CRON_SECRET',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const res = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
