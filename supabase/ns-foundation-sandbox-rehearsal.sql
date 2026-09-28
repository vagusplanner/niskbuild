-- =============================================================================
-- North South — sandbox rehearsal (paste-and-run)
-- Project: niskbuild-test-sandbox (confirm Active / not paused first)
-- Do NOT run on production.
--
-- How to use:
--   Paste §1 alone (if needed) → Run
--   Paste entire ns-foundation-migration.sql → Run
--   Paste §3 alone → Run (one result set; editor may hide earlier selects)
--   Edit USER_A_UUID / USER_B_UUID in §4, paste §4 alone → Run
--   The last statement of §4 is the pass/fail table — that is the result to read.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- §0 Preflight
-- -----------------------------------------------------------------------------
-- Dashboard → confirm project Active (unpause if needed).
-- Auth → create two users A (client) and B (will be promoted to coach mid-test).
-- Replace both UUIDs in §4 before running it.

-- -----------------------------------------------------------------------------
-- §1 Platform owner stub (REPLACE body with real prod definition you supply)
--     Skip if platform_owners + is_platform_owner() already exist on sandbox.
-- -----------------------------------------------------------------------------

create schema if not exists firstparty;

create table if not exists firstparty.platform_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- >>> PASTE real public.is_platform_owner() here (pg_get_functiondef from prod) <<<
create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public, firstparty
as $$
  select exists (
    select 1
    from firstparty.platform_owners po
    where po.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_owner() from public;
grant execute on function public.is_platform_owner() to authenticated, service_role;

-- Optional:
-- insert into firstparty.platform_owners (user_id)
-- select id from auth.users where lower(email) = lower('you@example.com')
-- on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- §2 Apply migration
--     Paste entire contents of supabase/ns-foundation-migration.sql and Run.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- §3 Verification (single result set — run this block alone after migration)
-- -----------------------------------------------------------------------------

select 'tables_rls' as check_group, c.relname as detail, c.relrowsecurity::text as value
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'firstparty' and c.relkind = 'r' and c.relname like 'ns_%'

union all

select 'policy', p.tablename || ' / ' || p.policyname, p.cmd
from pg_policies p
where p.schemaname = 'firstparty' and p.tablename like 'ns_%'

union all

select 'anon_grant', g.table_name, g.privilege_type
from information_schema.role_table_grants g
where g.table_schema = 'firstparty' and g.table_name like 'ns_%' and g.grantee = 'anon'

union all

select 'auth_bookings_grant', 'ns_bookings', g.privilege_type
from information_schema.role_table_grants g
where g.table_schema = 'firstparty'
  and g.table_name = 'ns_bookings'
  and g.grantee = 'authenticated'

order by 1, 2, 3;

-- Expect: anon_grant → ns_testimonials / SELECT only
-- Expect: auth_bookings_grant → SELECT only

-- -----------------------------------------------------------------------------
-- §4 RLS battery (edit UUIDs, paste this whole section alone, Run once)
--     Catches expected errors so one failure does not abort the script.
--     Ends with one result table: test_name | expected | actual | pass
--
-- Role switching: this uses SET ROLE inside a DO block (works when the SQL
-- editor runs as postgres/superuser). If the first row of the result table is
-- role_switch_available = fail, SET ROLE is blocked here — use the Dashboard
-- role selector (Impersonate) or the one-statement fallbacks at the bottom of
-- this section instead.
--
-- Variable naming: all PL/pgSQL locals use a v_ prefix so they never collide
-- with table columns (e.g. ns_booking_notes.booking_id). Column refs use
-- table aliases.
-- -----------------------------------------------------------------------------

-- >>> EDIT THESE TWO <<<
-- user A = client; user B = second user (promoted to coach mid-test, then removed)

do $rehearsal$
declare
  v_uid_a uuid := 'USER_A_UUID'::uuid;  -- replace
  v_uid_b uuid := 'USER_B_UUID'::uuid;  -- replace
  v_booking_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_note_id uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_goal_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_feat_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_hide_id uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_role_ok boolean := false;
  v_n int;
  v_actual text;
begin
  -- Results sink (re-runnable; drop/recreate so schema stays in sync)
  drop table if exists firstparty._ns_rls_rehearsal_results;
  create table firstparty._ns_rls_rehearsal_results (
    test_name text primary key,
    expected text not null,
    actual text not null,
    pass text not null check (pass in ('pass', 'fail')),
    created_at timestamptz not null default clock_timestamp()
  );
  grant select, insert, update, delete on firstparty._ns_rls_rehearsal_results
    to authenticated, anon, service_role;

  -- Complete cleanup of prior rehearsal seed (safe re-run)
  delete from firstparty.ns_booking_notes as n
    where n.id = v_note_id or n.booking_id = v_booking_id;
  delete from firstparty.ns_bookings as b
    where b.id = v_booking_id;
  delete from firstparty.ns_leadership_goals as g
    where g.id = v_goal_id;
  delete from firstparty.ns_testimonials as t
    where t.id in (v_feat_id, v_hide_id);
  delete from firstparty.ns_staff as s
    where s.user_id = v_uid_b;
  delete from firstparty.ns_user_settings as us
    where us.user_id = v_uid_b and us.locale = '__ns_rehearsal__';
  delete from firstparty.ns_google_calendar_connections as c
    where c.user_id = v_uid_a;
  delete from firstparty.ns_subscribers as sub
    where sub.email = 'anon@leak.test';

  -- Probe: can this session SET ROLE authenticated?
  begin
    execute 'set role authenticated';
    execute 'reset role';
    v_role_ok := true;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'role_switch_available',
      'SET ROLE authenticated works in SQL editor',
      'ok',
      'pass'
    );
  exception when others then
    v_role_ok := false;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'role_switch_available',
      'SET ROLE authenticated works in SQL editor',
      'blocked: ' || sqlerrm
        || ' — use Dashboard Impersonate or one-statement fallbacks below',
      'fail'
    );
  end;

  if v_role_ok then

  -- Seed as postgres (bypasses RLS)
  insert into firstparty.ns_bookings as b (
    id, user_id, client_name, client_email, service_tier, session_type, status, message
  ) values (
    v_booking_id, v_uid_a, 'Client A', 'a@example.com', 'hybrid',
    '1:1 Strategy Session', 'pending', 'Client-facing message'
  );

  insert into firstparty.ns_booking_notes as n (id, booking_id, author_id, body)
  values (v_note_id, v_booking_id, v_uid_a, 'INTERNAL coach note — staff only');

  insert into firstparty.ns_leadership_goals as g (id, user_id, title)
  values (v_goal_id, v_uid_a, 'A private goal');

  insert into firstparty.ns_testimonials as t (id, client_name, quote, is_featured) values
    (v_feat_id, 'Featured', 'Great', true),
    (v_hide_id, 'Hidden', 'Secret', false);

  insert into firstparty.ns_user_settings as us (user_id, locale)
  values (v_uid_b, '__ns_rehearsal__')
  on conflict (user_id) do update set locale = excluded.locale;

  insert into firstparty.ns_google_calendar_connections as c (user_id, access_token)
  values (v_uid_a, 'fake-token-rehearsal')
  on conflict (user_id) do update set access_token = excluded.access_token;

  -- ---------- As user A ----------
  perform set_config('request.jwt.claim.sub', v_uid_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_uid_a::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set role authenticated';

  -- A sees own booking
  begin
    select count(*) into v_n from firstparty.ns_bookings as b;
    v_actual := v_n::text;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'A_select_own_booking',
      '1',
      v_actual,
      case when v_n = 1 then 'pass' else 'fail' end
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('A_select_own_booking', '1', 'error: ' || sqlerrm, 'fail');
  end;

  -- A does not see internal notes
  begin
    select count(*) into v_n from firstparty.ns_booking_notes as n;
    v_actual := v_n::text;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'A_select_booking_notes',
      '0',
      v_actual,
      case when v_n = 0 then 'pass' else 'fail' end
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'A_select_booking_notes',
      '0 or blocked',
      'blocked as expected: ' || sqlerrm,
      'pass'
    );
  end;

  -- A sees own goal
  begin
    select count(*) into v_n from firstparty.ns_leadership_goals as g;
    v_actual := v_n::text;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'A_select_own_goal',
      '1',
      v_actual,
      case when v_n = 1 then 'pass' else 'fail' end
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('A_select_own_goal', '1', 'error: ' || sqlerrm, 'fail');
  end;

  -- A cannot insert booking
  begin
    insert into firstparty.ns_bookings as b (
      user_id, client_name, client_email, service_tier, session_type
    ) values (auth.uid(), 'Hack', 'h@x.com', 'hybrid', 'X');
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('A_insert_booking', 'blocked', 'allowed (unexpected)', 'fail');
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('A_insert_booking', 'blocked', 'blocked as expected: ' || sqlerrm, 'pass');
  end;

  -- A cannot insert self into ns_staff
  begin
    insert into firstparty.ns_staff as s (user_id, role)
    values (auth.uid(), 'coach');
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('A_insert_self_ns_staff', 'blocked', 'allowed (unexpected)', 'fail');
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('A_insert_self_ns_staff', 'blocked', 'blocked as expected: ' || sqlerrm, 'pass');
  end;

  -- A cannot write ns_user_settings for B
  begin
    update firstparty.ns_user_settings as us
    set locale = 'hacked-by-a'
    where us.user_id = v_uid_b;
    get diagnostics v_n = row_count;
    if v_n = 0 then
      insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
      values (
        'A_write_B_user_settings',
        'blocked or 0 rows',
        '0 rows updated (RLS)',
        'pass'
      );
    else
      insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
      values (
        'A_write_B_user_settings',
        'blocked or 0 rows',
        format('updated %s row(s) (unexpected)', v_n),
        'fail'
      );
    end if;
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'A_write_B_user_settings',
      'blocked or 0 rows',
      'blocked as expected: ' || sqlerrm,
      'pass'
    );
  end;

  -- A cannot update own booking status
  begin
    update firstparty.ns_bookings as b
    set status = 'confirmed'
    where b.id = v_booking_id;
    get diagnostics v_n = row_count;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'A_update_own_booking_status',
      'blocked',
      case when v_n > 0 then 'allowed (unexpected)'
           else '0 rows (unexpected under SELECT-only grant)' end,
      'fail'
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'A_update_own_booking_status',
      'blocked',
      'blocked as expected: ' || sqlerrm,
      'pass'
    );
  end;

  execute 'reset role';

  -- ---------- As user B (not yet staff) ----------
  perform set_config('request.jwt.claim.sub', v_uid_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_uid_b::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set role authenticated';

  begin
    select count(*) into v_n from firstparty.ns_bookings as b;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'B_select_A_booking_before_staff',
      '0',
      v_n::text,
      case when v_n = 0 then 'pass' else 'fail' end
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('B_select_A_booking_before_staff', '0', 'error: ' || sqlerrm, 'fail');
  end;

  begin
    select count(*) into v_n from firstparty.ns_leadership_goals as g;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'B_select_A_goal_before_staff',
      '0',
      v_n::text,
      case when v_n = 0 then 'pass' else 'fail' end
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('B_select_A_goal_before_staff', '0', 'error: ' || sqlerrm, 'fail');
  end;

  execute 'reset role';

  -- Promote B to coach (postgres)
  insert into firstparty.ns_staff as s (user_id, role)
  values (v_uid_b, 'coach')
  on conflict (user_id) do update set role = excluded.role;

  -- ---------- As user B (coach) ----------
  perform set_config('request.jwt.claim.sub', v_uid_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_uid_b::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set role authenticated';

  begin
    select count(*) into v_n
    from firstparty.ns_bookings as b
    where b.id = v_booking_id;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'B_coach_select_A_booking',
      '1',
      v_n::text,
      case when v_n = 1 then 'pass' else 'fail' end
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('B_coach_select_A_booking', '1', 'error: ' || sqlerrm, 'fail');
  end;

  begin
    select count(*) into v_n
    from firstparty.ns_booking_notes as n
    where n.id = v_note_id;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'B_coach_select_internal_note',
      '1',
      v_n::text,
      case when v_n = 1 then 'pass' else 'fail' end
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('B_coach_select_internal_note', '1', 'error: ' || sqlerrm, 'fail');
  end;

  -- Coach still cannot read calendar tokens (no grant / no policy)
  begin
    select count(*) into v_n from firstparty.ns_google_calendar_connections as c;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'B_coach_select_calendar_connections',
      'blocked',
      format('allowed count=%s (unexpected)', v_n),
      'fail'
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'B_coach_select_calendar_connections',
      'blocked',
      'blocked as expected: ' || sqlerrm,
      'pass'
    );
  end;

  execute 'reset role';

  -- Remove B from staff
  delete from firstparty.ns_staff as s
  where s.user_id = v_uid_b;

  -- ---------- As anon ----------
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  execute 'set role anon';

  begin
    select count(*) into v_n
    from firstparty.ns_testimonials as t
    where t.is_featured = true;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'anon_select_featured_testimonials',
      '1',
      v_n::text,
      case when v_n = 1 then 'pass' else 'fail' end
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('anon_select_featured_testimonials', '1', 'error: ' || sqlerrm, 'fail');
  end;

  begin
    select count(*) into v_n
    from firstparty.ns_testimonials as t
    where t.is_featured = false;
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'anon_select_non_featured_testimonials',
      '0',
      v_n::text,
      case when v_n = 0 then 'pass' else 'fail' end
    );
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values (
      'anon_select_non_featured_testimonials',
      '0',
      'error: ' || sqlerrm,
      'fail'
    );
  end;

  begin
    insert into firstparty.ns_subscribers as sub (email)
    values ('anon@leak.test');
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('anon_insert_subscriber', 'blocked', 'allowed (unexpected)', 'fail');
  exception when others then
    insert into firstparty._ns_rls_rehearsal_results (test_name, expected, actual, pass)
    values ('anon_insert_subscriber', 'blocked', 'blocked as expected: ' || sqlerrm, 'pass');
  end;

  execute 'reset role';

  -- Complete cleanup
  delete from firstparty.ns_booking_notes as n
    where n.id = v_note_id or n.booking_id = v_booking_id;
  delete from firstparty.ns_bookings as b
    where b.id = v_booking_id;
  delete from firstparty.ns_leadership_goals as g
    where g.id = v_goal_id;
  delete from firstparty.ns_testimonials as t
    where t.id in (v_feat_id, v_hide_id);
  delete from firstparty.ns_staff as s
    where s.user_id = v_uid_b;
  delete from firstparty.ns_user_settings as us
    where us.user_id = v_uid_b and us.locale in ('__ns_rehearsal__', 'hacked-by-a');
  delete from firstparty.ns_google_calendar_connections as c
    where c.user_id = v_uid_a;
  delete from firstparty.ns_subscribers as sub
    where sub.email = 'anon@leak.test';

  end if; -- v_role_ok
end;
$rehearsal$;

-- Single visible result (read this after the DO block):
select r.test_name, r.expected, r.actual, r.pass
from firstparty._ns_rls_rehearsal_results as r
order by r.created_at, r.test_name;

-- =============================================================================
-- Fallback if role_switch_available = fail
-- Use Dashboard → SQL → role selector "Impersonate user A/B", or paste ONE
-- statement at a time after manually:
--   select set_config('request.jwt.claim.sub', '<uuid>', true);
--   select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);
--   set role authenticated;
-- Then e.g.:
--   select count(*) from firstparty.ns_bookings;
--   insert into firstparty.ns_staff (user_id, role) values (auth.uid(), 'coach');  -- expect error
--   update firstparty.ns_bookings set status = 'confirmed' where user_id = auth.uid(); -- expect error
--   reset role;
-- =============================================================================

-- >>> RUN THIS LAST (after reviewing the result table above) <<<
-- drop table if exists firstparty._ns_rls_rehearsal_results;
