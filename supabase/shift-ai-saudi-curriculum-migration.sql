-- Shift AI — add Saudi Arabia curriculum option
-- Prerequisite: shift-ai-foundation-migration.sql
-- Run in Supabase SQL Editor when ready.

alter type firstparty.shift_curriculum add value if not exists 'saudi';
