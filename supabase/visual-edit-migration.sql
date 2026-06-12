-- Visual editor tracking + fractional credit debt
-- Run in Supabase SQL editor

alter table profiles
  add column if not exists credit_fraction_debt numeric(6, 2) default 0;

alter table metadata_logs
  add column if not exists prompt_type text,
  add column if not exists credits_used numeric(4, 2);

create index if not exists idx_metadata_logs_prompt_type
  on metadata_logs (prompt_type)
  where prompt_type is not null;
