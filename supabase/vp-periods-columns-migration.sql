-- Align firstparty.vp_periods with the Period/Fertility/Hayd UI fields.
-- Live production stub only had: id, user_id, due_date, created_at, name.
-- Period.list('-start_date') and Period.create({ start_date, cycle_length, ... })
-- were 400ing with: column vp_periods.start_date does not exist (42703).
-- Idempotent. After running: notify pgrst, 'reload schema';

create schema if not exists firstparty;

alter table firstparty.vp_periods
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists cycle_length integer,
  add column if not exists period_length integer,
  add column if not exists flow text,
  add column if not exists notes text,
  add column if not exists symptoms jsonb,
  add column if not exists updated_at timestamptz default now();

-- Backfill start_date from legacy due_date when present.
update firstparty.vp_periods
set start_date = due_date::date
where start_date is null
  and due_date is not null;

comment on column firstparty.vp_periods.start_date is
  'First day of menstrual period (UI Period.start_date)';
comment on column firstparty.vp_periods.due_date is
  'Legacy Base44-era date column; kept in sync with start_date by the client mapper';

notify pgrst, 'reload schema';
