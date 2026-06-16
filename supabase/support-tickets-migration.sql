-- Support tickets + messages (Prompt: form-based contact, no public email)

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text not null default '',
  subject text not null,
  category text not null default 'general',
  status text not null default 'open',
  priority text not null default 'normal',
  plan_tier text,
  source text not null default 'contact_form',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on support_tickets (user_id, created_at desc);
create index if not exists idx_support_tickets_status on support_tickets (status, updated_at desc);
create index if not exists idx_support_tickets_email on support_tickets (email);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'admin', 'system')),
  sender_email text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_ticket on support_messages (ticket_id, created_at asc);

alter table support_tickets enable row level security;
alter table support_messages enable row level security;

create policy "Users read own tickets"
  on support_tickets for select
  using (auth.uid() = user_id);

create policy "Users read own ticket messages"
  on support_messages for select
  using (
    exists (
      select 1 from support_tickets t
      where t.id = support_messages.ticket_id and t.user_id = auth.uid()
    )
  );

-- Admin discount on profiles (0–100%)
alter table profiles
  add column if not exists admin_discount_percent integer not null default 0
    check (admin_discount_percent >= 0 and admin_discount_percent <= 100),
  add column if not exists admin_discount_note text,
  add column if not exists admin_discount_applied_at timestamptz,
  add column if not exists admin_discount_applied_by text;
