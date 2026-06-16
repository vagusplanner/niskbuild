-- AI agent human escalations (email fallback to support team)

create table if not exists agent_escalations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  message text not null,
  conversation_history jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  priority text not null default 'normal',
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_escalations_user on agent_escalations (user_id, created_at desc);
create index if not exists idx_agent_escalations_status on agent_escalations (status, created_at desc);

alter table agent_escalations enable row level security;

create policy "Users read own escalations"
  on agent_escalations for select
  using (auth.uid() = user_id);
