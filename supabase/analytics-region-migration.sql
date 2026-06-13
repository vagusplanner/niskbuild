-- Optional country-level region for anonymous analytics (Settings → Privacy)
alter table profiles
  add column if not exists analytics_region text default null;
