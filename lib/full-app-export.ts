/**
 * Full App Mode — ZIP export preparation (React + Vite).
 *
 * v1: produce a runnable project tree the user can unzip and
 * `npm install && npm run dev`. No secrets in the ZIP — only .env.example.
 */

import { injectDataClientScaffold } from '@/lib/full-app-dataclient/inject';
import {
  DATACLIENT_PATH,
  ENV_EXAMPLE_PATH,
  SCHEMA_SQL_PATH,
  SUPABASE_ADAPTER_PATH,
} from '@/lib/full-app-dataclient/scaffold-files';
import { isFullAppProjectFiles } from '@/lib/full-app-bundle';
import type { ProjectFile } from '@/lib/project-files';
import type { NiskBuildConfig, NiskBuildPromptEntry } from '@/lib/niskbuild-config';

export type FullAppExportBackendHint = {
  /** User connected BYO in builder — URL only, never the anon key */
  supabaseUrl?: string | null;
  connected?: boolean;
};

export type FullAppExportResult = {
  files: Record<string, string>;
  readme: string;
  rootFolderName: string;
};

const GITIGNORE = `# Dependencies
node_modules/

# Build
dist/
dist-ssr/
*.local

# Env (never commit secrets)
.env
.env.*.local

# Editor / OS
.DS_Store
.vscode/*
!.vscode/extensions.json
.idea/

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
`;

function ensurePackageJson(raw: string | undefined): string {
  let pkg: Record<string, unknown>;
  try {
    pkg = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    pkg = {};
  }
  if (!pkg.name || typeof pkg.name !== 'string') pkg.name = 'niskbuild-full-app';
  pkg.private = true;
  pkg.type = 'module';
  const scripts = {
    ...(typeof pkg.scripts === 'object' && pkg.scripts
      ? (pkg.scripts as Record<string, string>)
      : {}),
  };
  if (!scripts.dev) scripts.dev = 'vite';
  if (!scripts.build) scripts.build = 'vite build';
  if (!scripts.preview) scripts.preview = 'vite preview';
  pkg.scripts = scripts;

  const deps = {
    ...(typeof pkg.dependencies === 'object' && pkg.dependencies
      ? (pkg.dependencies as Record<string, string>)
      : {}),
  };
  if (!deps.react) deps.react = '^19.0.0';
  if (!deps['react-dom']) deps['react-dom'] = '^19.0.0';
  if (!deps['react-router-dom']) deps['react-router-dom'] = '^7.1.1';
  if (!deps['@supabase/supabase-js']) deps['@supabase/supabase-js'] = '^2.49.0';
  pkg.dependencies = deps;

  const devDeps = {
    ...(typeof pkg.devDependencies === 'object' && pkg.devDependencies
      ? (pkg.devDependencies as Record<string, string>)
      : {}),
  };
  if (!devDeps.vite) devDeps.vite = '^5.4.0';
  if (!devDeps['@vitejs/plugin-react']) {
    devDeps['@vitejs/plugin-react'] = '^4.3.1';
  }
  pkg.devDependencies = devDeps;

  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function ensureViteConfig(raw: string | undefined): string {
  if (raw?.trim()) return raw;
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
}

function ensureIndexHtml(raw: string | undefined): string {
  if (raw?.trim()) return raw;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NiskBuild Full App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
}

function buildEnvExample(hint?: FullAppExportBackendHint): string {
  const url =
    hint?.connected && hint.supabaseUrl?.trim()
      ? hint.supabaseUrl.trim()
      : 'https://YOUR_PROJECT.supabase.co';
  return `# Copy to .env and fill in values from Supabase → Project Settings → API
# Never commit .env (see .gitignore).

VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ANON_KEY=your_anon_or_publishable_key_here
`;
}

function buildReadme(opts: {
  projectName: string;
  prompt: string;
  backend?: FullAppExportBackendHint;
  hasSchema: boolean;
}): string {
  const name = opts.projectName.replace(/"/g, "'") || 'NiskBuild Full App';
  const promptLine = (opts.prompt || '').trim().slice(0, 120) || '(no prompt saved)';
  const backendNote =
    opts.backend?.connected && opts.backend.supabaseUrl
      ? `This export was connected in NiskBuild to:\n\`${opts.backend.supabaseUrl}\`\n\nCopy \`.env.example\` → \`.env\` and paste your **anon/public** key (never the service role key). The URL is pre-filled; the key is not included in the ZIP for safety.`
      : `Copy \`.env.example\` → \`.env\` and add your Supabase project URL + anon key from Supabase → Project Settings → API.`;

  const schemaNote = opts.hasSchema
    ? `## Database schema\n\nIf you have not already, run \`supabase/schema.sql\` in the Supabase SQL Editor (creates tables, GRANTs, and RLS).\n`
    : '';

  return `# ${name}

React + Vite app generated with [NiskBuild](https://niskbuild.com) Full App mode.

**Prompt:** ${promptLine}

## Run locally

\`\`\`bash
npm install
cp .env.example .env
# edit .env with your Supabase anon key
npm run dev
\`\`\`

Open the URL Vite prints (usually http://localhost:5173).

${backendNote}

${schemaNote}
## Scripts

| Command | What it does |
|---------|----------------|
| \`npm run dev\` | Local Vite dev server |
| \`npm run build\` | Production build → \`dist/\` |
| \`npm run preview\` | Preview the production build locally |

## Deploy (static Vite SPA)

This is a client-side Vite app. Common hosts:

1. **Vercel** — Import the repo (or \`vercel\` CLI). Framework preset: Vite. Env vars: \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`.
2. **Netlify** — Build command \`npm run build\`, publish directory \`dist\`. Same env vars in Site settings.
3. Any static host — upload \`dist/\` after \`npm run build\`.

Configure your Supabase Auth URL allow-list for the production origin (Authentication → URL configuration).

## Re-open in NiskBuild

This ZIP includes \`niskbuild.config.json\`. Drop the ZIP onto the NiskBuild builder to restore files and prompt history.

---
Built with NiskBuild — Build anything. Own everything.
`;
}

/**
 * Detect Full App export from a files map (path → content).
 */
export function isFullAppExportFiles(files: Record<string, string> | null | undefined): boolean {
  if (!files || typeof files !== 'object') return false;
  const asProject: ProjectFile[] = Object.entries(files).map(([path, content]) => ({
    path,
    name: path.split('/').pop() || path,
    content: typeof content === 'string' ? content : '',
    icon: '📄',
  }));
  return isFullAppProjectFiles(asProject);
}

/**
 * Normalize project files into a shippable Vite tree + README.
 * Never embeds anon keys or service role secrets.
 */
export function prepareFullAppExport(opts: {
  files: Record<string, string>;
  projectName: string;
  prompt: string;
  backend?: FullAppExportBackendHint;
}): FullAppExportResult {
  const prepared = injectDataClientScaffold({ ...opts.files });

  prepared['package.json'] = ensurePackageJson(prepared['package.json']);
  prepared['vite.config.js'] = ensureViteConfig(
    prepared['vite.config.js'] || prepared['vite.config.ts']
  );
  // Prefer .js for v1; drop empty .ts twin confusion if we synthesized .js
  if (!opts.files['vite.config.ts']?.trim() && prepared['vite.config.ts'] === undefined) {
    delete prepared['vite.config.ts'];
  }
  prepared['index.html'] = ensureIndexHtml(prepared['index.html']);
  prepared[ENV_EXAMPLE_PATH] = buildEnvExample(opts.backend);
  prepared['.gitignore'] = GITIGNORE;

  // Ensure DataClient paths exist (inject already does)
  if (!prepared[DATACLIENT_PATH] || !prepared[SUPABASE_ADAPTER_PATH]) {
    throw new Error('Full App export missing DataClient scaffold');
  }

  const hasSchema = Boolean(prepared[SCHEMA_SQL_PATH]?.trim());
  const readme = buildReadme({
    projectName: opts.projectName,
    prompt: opts.prompt,
    backend: opts.backend,
    hasSchema,
  });
  prepared['README.md'] = readme;

  const slug =
    opts.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'niskbuild-full-app';

  return {
    files: prepared,
    readme,
    rootFolderName: slug,
  };
}

export function buildFullAppNiskConfig(opts: {
  projectName: string;
  prompt: string;
  files: Record<string, string>;
  promptHistory?: NiskBuildPromptEntry[];
  activeFile?: string;
}): NiskBuildConfig {
  const now = new Date().toISOString();
  const history =
    opts.promptHistory && opts.promptHistory.length > 0
      ? opts.promptHistory
      : [{ prompt: opts.prompt, timestamp: now, target: 'full-app' }];

  return {
    version: '1.0',
    projectName: opts.projectName,
    createdAt: now,
    updatedAt: now,
    promptHistory: history,
    activeFile: opts.activeFile || 'src/App.jsx',
    files: opts.files,
  };
}
