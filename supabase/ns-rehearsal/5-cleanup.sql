-- File 5/5 — drop scratch RLS results table.
-- What: removes firstparty._ns_rls_rehearsal_results after you have reviewed file 4 output.
-- Expect: Success. Table gone (or notice if already absent).
-- Re-run: Safe (IF EXISTS). Run last, after reading the pass/fail table from file 4.

drop table if exists firstparty._ns_rls_rehearsal_results;
