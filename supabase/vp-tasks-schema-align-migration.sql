-- Align firstparty.vp_tasks with what the Tasks UI / AI generators actually create.
-- Production schema (confirmed via live select *): id, user_id, title, description,
-- due_date, priority (text labels like "high"), status, category_id, created_at,
-- updated_at, completed_at, event_id, assigned_to, assigned_by.
--
-- Missing fields the UI collects and AI generators return:
--   category, estimated_minutes, subtasks, notes, tags, dependencies, due_time
--
-- Idempotent. After running, force PostgREST to see the new columns:
--   notify pgrst, 'reload schema';

alter table firstparty.vp_tasks
  add column if not exists category text not null default 'personal';

alter table firstparty.vp_tasks
  add column if not exists estimated_minutes integer
  check (estimated_minutes is null or estimated_minutes > 0);

alter table firstparty.vp_tasks
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

alter table firstparty.vp_tasks
  add column if not exists notes text;

alter table firstparty.vp_tasks
  add column if not exists tags jsonb not null default '[]'::jsonb;

-- Dependencies: array of { task_id, task_title?, type? }
alter table firstparty.vp_tasks
  add column if not exists dependencies jsonb not null default '[]'::jsonb;

alter table firstparty.vp_tasks
  add column if not exists due_time text;

comment on column firstparty.vp_tasks.dependencies is
  'JSON array of dependency refs: [{ task_id, task_title?, type? }]';

comment on column firstparty.vp_tasks.subtasks is
  'JSON array of subtasks: [{ title, completed? }]';

notify pgrst, 'reload schema';
