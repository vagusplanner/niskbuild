-- North South Google Calendar OAuth — widen oauth_states provider check.
-- Distinct from VP's 'google_calendar' so NS and VP flows never share state rows.
-- Prerequisite: buffer-social-hub-migration.sql + vp-google-calendar-sync-migration.sql

begin;

alter table firstparty.oauth_states
  drop constraint if exists oauth_states_provider_check;

alter table firstparty.oauth_states
  add constraint oauth_states_provider_check
  check (provider in ('buffer', 'google_calendar', 'ns_google_calendar'));

commit;
