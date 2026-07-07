-- Link tasks to calendar events (used by EventDetailsModal and related-task UI).
alter table firstparty.vp_tasks
  add column if not exists event_id uuid references firstparty.vp_events(id) on delete set null;

create index if not exists idx_firstparty_vp_tasks_event
  on firstparty.vp_tasks (user_id, event_id)
  where event_id is not null;
