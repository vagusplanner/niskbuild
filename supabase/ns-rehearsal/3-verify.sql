-- File 3/5 — post-migration verification (read-only).
-- What: lists ns_ tables/RLS, policies, anon grants, and authenticated grants on ns_bookings.
-- Expect: one result set. anon_grant → ns_testimonials/SELECT only; auth_bookings_grant → SELECT only.
-- Re-run: Safe (read-only). Run after file 2.

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
