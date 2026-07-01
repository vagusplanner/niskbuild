-- Shift AI Stage 2 — quiz arcade scores
-- Prerequisite: shift-ai-foundation + auth + stage1 migrations
-- Run in Supabase SQL Editor when ready.

-- ─── Arcade scores ───────────────────────────────────────────────────────

create table if not exists firstparty.shift_arcade_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  subject text,
  score integer not null default 0,
  questions_total integer not null default 0,
  questions_correct integer not null default 0,
  streak_bonus integer not null default 0,
  played_at timestamptz not null default now(),
  constraint shift_arcade_scores_score_non_negative check (score >= 0),
  constraint shift_arcade_scores_questions_total_non_negative check (questions_total >= 0),
  constraint shift_arcade_scores_questions_correct_non_negative check (questions_correct >= 0),
  constraint shift_arcade_scores_streak_bonus_non_negative check (streak_bonus >= 0),
  constraint shift_arcade_scores_correct_lte_total
    check (questions_correct <= questions_total)
);

create index if not exists idx_shift_arcade_scores_student_played
  on firstparty.shift_arcade_scores (student_id, played_at desc);

comment on table firstparty.shift_arcade_scores is
  'Quiz arcade session results — 60-second AI quiz blitz scores per student.';

-- ─── Row level security ───────────────────────────────────────────────────

alter table firstparty.shift_arcade_scores enable row level security;

drop policy if exists "Students manage own shift_arcade_scores" on firstparty.shift_arcade_scores;
create policy "Students manage own shift_arcade_scores"
  on firstparty.shift_arcade_scores for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_arcade_scores.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_arcade_scores.student_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on firstparty.shift_arcade_scores to authenticated;
grant all on firstparty.shift_arcade_scores to service_role;

grant usage on schema firstparty to authenticated, service_role;

-- ─── Flashcard decks ─────────────────────────────────────────────────────

create table if not exists firstparty.shift_flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  subject text,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_shift_flashcard_decks_student_created
  on firstparty.shift_flashcard_decks (student_id, created_at desc);

comment on table firstparty.shift_flashcard_decks is
  'Student flashcard decks — grouped collections for spaced repetition study.';

-- ─── Flashcards ──────────────────────────────────────────────────────────

create table if not exists firstparty.shift_flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references firstparty.shift_flashcard_decks(id) on delete cascade,
  front text not null,
  back text not null,
  ease_factor numeric not null default 2.5,
  interval_days integer not null default 1,
  repetitions integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint shift_flashcards_ease_factor_min check (ease_factor >= 1.3),
  constraint shift_flashcards_interval_days_non_negative check (interval_days >= 0),
  constraint shift_flashcards_repetitions_non_negative check (repetitions >= 0)
);

create index if not exists idx_shift_flashcards_deck
  on firstparty.shift_flashcards (deck_id);

create index if not exists idx_shift_flashcards_next_review
  on firstparty.shift_flashcards (deck_id, next_review_at);

comment on table firstparty.shift_flashcards is
  'Individual flashcards with SM-2 spaced repetition scheduling fields.';

-- ─── Flashcards RLS ──────────────────────────────────────────────────────

alter table firstparty.shift_flashcard_decks enable row level security;
alter table firstparty.shift_flashcards enable row level security;

drop policy if exists "Students manage own shift_flashcard_decks" on firstparty.shift_flashcard_decks;
create policy "Students manage own shift_flashcard_decks"
  on firstparty.shift_flashcard_decks for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_flashcard_decks.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_flashcard_decks.student_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Students manage own shift_flashcards" on firstparty.shift_flashcards;
create policy "Students manage own shift_flashcards"
  on firstparty.shift_flashcards for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_flashcard_decks d
      join firstparty.shift_students s on s.id = d.student_id
      where d.id = shift_flashcards.deck_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_flashcard_decks d
      join firstparty.shift_students s on s.id = d.student_id
      where d.id = shift_flashcards.deck_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on firstparty.shift_flashcard_decks to authenticated;
grant all on firstparty.shift_flashcard_decks to service_role;

grant select, insert, update, delete on firstparty.shift_flashcards to authenticated;
grant all on firstparty.shift_flashcards to service_role;
