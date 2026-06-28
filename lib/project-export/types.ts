export type ProjectExportJobStatus =
  | 'pending'
  | 'building'
  | 'syncing'
  | 'ready'
  | 'ready_zip_only'
  | 'failed';

export type ProjectExportJobRecord = {
  id: string;
  project_id: string;
  user_id: string;
  status: ProjectExportJobStatus;
  log: string;
  download_url: string | null;
  storage_path: string | null;
  capacitor_root: string | null;
  ios_workspace: string | null;
  started_at: string;
  finished_at: string | null;
};

export type ProjectExportChecklist = {
  bundleId: string | null;
  bundleIdSet: boolean;
  iconUrl: string | null;
  iconUploaded: boolean;
  privacyPolicyUrl: string | null;
  privacyPolicySet: boolean;
};
