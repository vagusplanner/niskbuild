-- Age-gate attestation flag (DOB is verified at submit time and not stored).
-- [LEGAL REVIEW NEEDED] Confirm attestation-without-DOB-retention is acceptable.

alter table public.profiles
  add column if not exists age_minimum_attested_at timestamptz;

comment on column public.profiles.age_minimum_attested_at is
  'Set when the user passed the minimum-age (13+) check. Date of birth is not retained.';
