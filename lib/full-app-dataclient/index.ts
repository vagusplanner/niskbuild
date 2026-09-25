export {
  DATACLIENT_PATH,
  SUPABASE_ADAPTER_PATH,
  ENV_EXAMPLE_PATH,
  SCHEMA_SQL_PATH,
  DATACLIENT_SOURCE,
  SUPABASE_ADAPTER_SOURCE,
  ENV_EXAMPLE_SOURCE,
  PATTERN_A_SCHEMA_SQL,
  getDataClientScaffoldFiles,
} from '@/lib/full-app-dataclient/scaffold-files';

export {
  injectDataClientScaffold,
  projectFilesWithDataClientScaffold,
  isSupabaseAdapterPath,
  findIllegalSupabaseImports,
} from '@/lib/full-app-dataclient/inject';
