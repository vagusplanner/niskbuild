-- File 4/5 — RLS battery (sandbox SQL editor).
-- What: seeds fixtures, impersonates users A/B/anon via SET ROLE, records pass/fail rows.
-- Expect: final result table test_name | expected | actual | pass (all pass if healthy).
-- Re-run: Safe (cleans prior seed; recreates results table).
-- User A = nsa@example.com; User B = nsb@example.com (sandbox Auth UUIDs filled in).
-- Do NOT run on production.

-- >>> Sandbox Auth user IDs (nsa@example.com / nsb@example.com) <<<
-- user A = client; user B = second user (promoted to coach mid-test, then removed)

do $rehearsal$
declare
  v_uid_a uuid := 'cdd647b1-18c3-4f28-9f96-f9785d33183e'::uuid;  -- nsa@example.com
  v_uid_b uuid := 'cfb4d1dd-804a-489e-b803-477242a55f90'::uuid;  -- nsb@example.com
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
