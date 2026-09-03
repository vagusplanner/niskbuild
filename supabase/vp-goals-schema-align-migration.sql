-- Align firstparty.vp_goals with what the Goals UI actually creates/updates.
-- Production schema (confirmed): id, user_id, title, description, target_date,
-- status, created_at, priority — missing progress (and category, which the form
-- collects and the Goals page filters on).
--
-- Idempotent. After running, force PostgREST to see the new columns:
--   notify pgrst, 'reload schema';

alter table firstparty.vp_goals
  add column if not exists progress smallint not null default 0
  check (progress between 0 and 100);

alter table firstparty.vp_goals
  add column if not exists category text not null default 'personal';

alter table firstparty.vp_goals
  add column if not exists updated_at timestamptz not null default now();

-- Optional extended fields used by LifeGoalForm / GoalFormModal (stored, not
-- required for create to succeed — prevents silent data loss).
alter table firstparty.vp_goals
  add column if not exists motivation text;

alter table firstparty.vp_goals
  add column if not exists obstacles text;

alter table firstparty.vp_goals
  add column if not exists notes text;

alter table firstparty.vp_goals
  add column if not exists tags jsonb not null default '[]'::jsonb;

alter table firstparty.vp_goals
  add column if not exists resources_needed jsonb not null default '[]'::jsonb;

alter table firstparty.vp_goals
  add column if not exists action_steps jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
