-- Shift AI Phase 2a.0 — study language preference (en | ar)
-- Prerequisite: shift-ai-foundation-migration.sql (+ saudi curriculum enum)
-- Run in Supabase SQL Editor when ready.

alter table firstparty.shift_students
  add column if not exists study_language text not null default 'en';

update firstparty.shift_students
  set study_language = 'ar'
  where curriculum = 'saudi'
    and study_language = 'en';

alter table firstparty.shift_students
  drop constraint if exists shift_students_study_language_check;

alter table firstparty.shift_students
  add constraint shift_students_study_language_check
  check (study_language in ('en', 'ar'));

comment on column firstparty.shift_students.study_language is
  'AI/study output language preference: en (default) or ar. Defaults to ar for Saudi curriculum on insert/backfill; students can override in Settings.';
