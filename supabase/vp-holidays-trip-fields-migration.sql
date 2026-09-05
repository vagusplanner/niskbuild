-- Vagus Planner: extend vp_holidays from calendar-holiday stub → trip/holiday records
-- used by Travel hub / HolidayForm (destination, date range, budget, etc.).
-- Safe to re-run.

create schema if not exists firstparty;

alter table firstparty.vp_holidays
  add column if not exists destination text;

alter table firstparty.vp_holidays
  add column if not exists end_date date;

alter table firstparty.vp_holidays
  add column if not exists status text not null default 'planned';

alter table firstparty.vp_holidays
  add column if not exists budget numeric;

alter table firstparty.vp_holidays
  add column if not exists accommodation text;

alter table firstparty.vp_holidays
  add column if not exists flight_details text;

-- Ensure holiday_date stays usable when only end_date is set by older clients
-- (start remains required by existing NOT NULL on holiday_date).

comment on column firstparty.vp_holidays.destination is 'Trip destination (Travel hub)';
comment on column firstparty.vp_holidays.end_date is 'Trip end date; holiday_date is start';
