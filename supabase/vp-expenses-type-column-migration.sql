-- Persist finance entry type (expense/income/saving/zakat/sadaqa) on vp_expenses.
-- UI always sent `type` but the column was missing and the client mapper dropped it,
-- so Dashboard SpendingWidget showed $0 despite real rows.
-- Idempotent. After running: notify pgrst, 'reload schema';

create schema if not exists firstparty;

alter table firstparty.vp_expenses
  add column if not exists type text;

comment on column firstparty.vp_expenses.type is
  'Entry kind: expense | income | saving | zakat | sadaqa';

-- Backfill: treat historical rows without type as expenses (matches UI default).
update firstparty.vp_expenses
set type = 'expense'
where type is null or btrim(type) = '';

notify pgrst, 'reload schema';
