-- Shift AI Stage 4 — essays (marker, workshop, content generator)
-- Prerequisite: shift-ai-foundation + auth + stage3 (shift_homework_uploads)
-- Run in Supabase SQL Editor when ready.

-- ─── Essays ──────────────────────────────────────────────────────────────

create table if not exists firstparty.shift_essays (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  subject text not null,
  title text,
  content text not null default '',
  submission_type text not null default 'typed'
    check (submission_type in ('typed', 'photo')),
  photo_upload_id uuid references firstparty.shift_homework_uploads(id) on delete set null,
  ai_feedback jsonb,
  grade_estimate text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shift_essays_student_created
  on firstparty.shift_essays (student_id, created_at desc);

create index if not exists idx_shift_essays_student_subject
  on firstparty.shift_essays (student_id, subject);

comment on table firstparty.shift_essays is
  'Student essays from Essay Marker and Essay Workshop — drafts and marked submissions.';

-- ─── Row level security ───────────────────────────────────────────────────

alter table firstparty.shift_essays enable row level security;

drop policy if exists "Students manage own shift_essays" on firstparty.shift_essays;
create policy "Students manage own shift_essays"
  on firstparty.shift_essays for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_essays.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_essays.student_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on firstparty.shift_essays to authenticated;
grant all on firstparty.shift_essays to service_role;

-- ─── Grade predictions ───────────────────────────────────────────────────

create table if not exists firstparty.shift_grade_predictions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  subject text not null,
  predicted_grade text not null,
  confidence numeric not null default 0,
  factors jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists idx_shift_grade_predictions_student_generated
  on firstparty.shift_grade_predictions (student_id, generated_at desc);

create index if not exists idx_shift_grade_predictions_student_subject
  on firstparty.shift_grade_predictions (student_id, subject);

comment on table firstparty.shift_grade_predictions is
  'AI grade predictions with transparent signal factors per subject.';

alter table firstparty.shift_grade_predictions enable row level security;

drop policy if exists "Students manage own shift_grade_predictions" on firstparty.shift_grade_predictions;
create policy "Students manage own shift_grade_predictions"
  on firstparty.shift_grade_predictions for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_grade_predictions.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_grade_predictions.student_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on firstparty.shift_grade_predictions to authenticated;
grant all on firstparty.shift_grade_predictions to service_role;

-- ─── Spec points ─────────────────────────────────────────────────────────

create table if not exists firstparty.shift_spec_points (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  subject text not null,
  spec_code text not null,
  description text not null,
  status text not null default 'not_covered'
    check (status in ('not_covered', 'covered', 'needs_review')),
  updated_at timestamptz not null default now(),
  constraint shift_spec_points_student_subject_code_unique
    unique (student_id, subject, spec_code)
);

create index if not exists idx_shift_spec_points_student_subject
  on firstparty.shift_spec_points (student_id, subject);

comment on table firstparty.shift_spec_points is
  'Curriculum specification points tracked per student and subject.';

alter table firstparty.shift_spec_points enable row level security;

drop policy if exists "Students manage own shift_spec_points" on firstparty.shift_spec_points;
create policy "Students manage own shift_spec_points"
  on firstparty.shift_spec_points for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_spec_points.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_spec_points.student_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on firstparty.shift_spec_points to authenticated;
grant all on firstparty.shift_spec_points to service_role;

grant usage on schema firstparty to authenticated, service_role;
