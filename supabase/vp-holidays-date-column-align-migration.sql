-- Align firstparty.vp_holidays with production Base44-era stub + trip fields.
--
-- Live PostgREST probe (2026-09-06) confirmed production has:
--   id, user_id, name, date, created_at, status, destination, end_date,
--   budget, accommodation, flight_details
-- and does NOT have: holiday_date, notes, recurring_yearly, updated_at.
--
-- Repo migrations (vp-goals-holidays-migration.sql) assumed holiday_date/notes;
-- CREATE TABLE IF NOT EXISTS was a silent no-op against the existing stub.
-- Client compat now writes `date`. This migration is optional hardening:
-- add missing convenience columns if you want both names, without renaming.

create schema if not exists firstparty;

-- Ensure the production start-date column exists (no-op if already present).
alter table firstparty.vp_holidays
  add column if not exists date date;

-- Optional alias for older clients / reporting (safe if unused).
alter table firstparty.vp_holidays
  add column if not exists holiday_date date;

-- Backfill holiday_date from date when only date is set.
update firstparty.vp_holidays
set holiday_date = date
where holiday_date is null and date is not null;

update firstparty.vp_holidays
set date = holiday_date
where date is null and holiday_date is not null;

comment on column firstparty.vp_holidays.date is 'Trip/holiday start date (production Base44 column)';
comment on column firstparty.vp_holidays.holiday_date is 'Optional alias of date for legacy clients';

-- After applying: notify pgrst, 'reload schema';
