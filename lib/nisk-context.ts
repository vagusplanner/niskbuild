/** Shared client/server types for Nisk context (no server-only imports). */

export type BuilderSurfaceContext = {
  projectSettingsOpen?: boolean;
  projectSettingsTab?: string | null;
  inspectorOpen?: boolean;
  inspectorTab?: string | null;
  visualEditMode?: boolean;
};

export type NiskCitation = {
  type: 'docs' | 'tips';
  href: string;
  title: string;
};
