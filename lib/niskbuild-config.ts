export interface NiskBuildPromptEntry {
  prompt: string;
  timestamp: string;
  target?: string;
}

export interface NiskBuildConfig {
  version: '1.0';
  projectName: string;
  createdAt: string;
  updatedAt: string;
  promptHistory: NiskBuildPromptEntry[];
  activeFile: string;
  files: Record<string, string>;
}

export function createNiskBuildConfig({
  projectName,
  prompt,
  code,
  promptHistory = [],
  activeFile = 'index.html',
}: {
  projectName: string;
  prompt: string;
  code: string;
  promptHistory?: NiskBuildPromptEntry[];
  activeFile?: string;
}): NiskBuildConfig {
  const now = new Date().toISOString();
  const history =
    promptHistory.length > 0
      ? promptHistory
      : [{ prompt, timestamp: now }];

  return {
    version: '1.0',
    projectName,
    createdAt: now,
    updatedAt: now,
    promptHistory: history,
    activeFile,
    files: {
      'index.html': code,
      'styles.css': '/* Extracted styles — edit or regenerate */\n',
      'script.js': '// App logic — edit or regenerate\n',
    },
  };
}

export function parseNiskBuildConfig(raw: unknown): NiskBuildConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const cfg = raw as Partial<NiskBuildConfig>;
  if (cfg.version !== '1.0' || !cfg.files || typeof cfg.files !== 'object') return null;
  return cfg as NiskBuildConfig;
}
