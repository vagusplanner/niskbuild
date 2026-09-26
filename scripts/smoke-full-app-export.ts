/**
 * Evidence: prepare Full App export → write tree → npm install && npm run build && vite serve.
 * Run: npx --yes tsx --tsconfig tsconfig.json scripts/smoke-full-app-export.ts
 */
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawn, spawnSync } from 'child_process';
import { prepareFullAppExport } from '@/lib/full-app-export';
import { PATTERN_A_HABITS_FILES } from '@/lib/full-app-preview/pattern-a-habits-fixture';

const outRoot = join(process.cwd(), '.tmp-full-app-export-evidence');
const appDir = join(outRoot, 'streakly-export');

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

if (existsSync(outRoot)) rmSync(outRoot, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });

const prepared = prepareFullAppExport({
  files: PATTERN_A_HABITS_FILES,
  projectName: 'Streakly Export Evidence',
  prompt: 'Habit tracker with auth and Supabase',
  backend: {
    connected: true,
    supabaseUrl: 'https://example.supabase.co',
  },
});

assert(prepared.files['package.json'], 'package.json missing');
assert(prepared.files['vite.config.js'], 'vite.config.js missing');
assert(prepared.files['index.html'], 'index.html missing');
assert(prepared.files['src/main.jsx'] || prepared.files['src/main.tsx'], 'main entry missing');
assert(prepared.files['.env.example'], '.env.example missing');
assert(prepared.files['README.md']?.includes('npm run dev'), 'README missing run instructions');
assert(prepared.files['.gitignore']?.includes('.env'), '.gitignore must ignore .env');
assert(!prepared.files['.env'], 'must not ship .env secrets');
assert(
  prepared.files['.env.example'].includes('https://example.supabase.co'),
  'connected URL should prefill .env.example'
);
assert(
  !/eyJ[A-Za-z0-9_-]{10,}|sb_publishable_|service_role/i.test(
    prepared.files['.env.example']
  ),
  '.env.example must not contain real keys'
);
assert(prepared.files['src/lib/dataClient.js'], 'DataClient must be injected');
assert(prepared.files['src/lib/adapters/supabase.js'], 'adapter must be injected');

for (const [rel, content] of Object.entries(prepared.files)) {
  const dest = join(appDir, rel);
  mkdirSync(join(dest, '..'), { recursive: true });
  writeFileSync(dest, content);
}

console.log(`✓ wrote ${Object.keys(prepared.files).length} files → ${appDir}`);

const npmInstall = spawnSync('npm', ['install'], {
  cwd: appDir,
  encoding: 'utf8',
  timeout: 180_000,
  env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
});
assert(
  npmInstall.status === 0,
  `npm install failed:\n${npmInstall.stderr}\n${npmInstall.stdout}`
);
console.log('✓ npm install');

const npmBuild = spawnSync('npm', ['run', 'build'], {
  cwd: appDir,
  encoding: 'utf8',
  timeout: 120_000,
});
assert(
  npmBuild.status === 0,
  `npm run build failed:\n${npmBuild.stderr}\n${npmBuild.stdout}`
);
assert(existsSync(join(appDir, 'dist/index.html')), 'dist/index.html missing after build');
console.log('✓ npm run build → dist/');

async function proveViteDev(): Promise<void> {
  const port = 5199;
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'npx',
      ['vite', '--host', '127.0.0.1', '--port', String(port)],
      {
        cwd: appDir,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    let ready = false;
    const finish = (err?: Error) => {
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else resolve();
    };
    const onData = (buf: Buffer) => {
      const text = buf.toString();
      if (!ready && /Local:|ready in/i.test(text)) {
        ready = true;
        void (async () => {
          try {
            const res = await fetch(`http://127.0.0.1:${port}/`);
            const html = await res.text();
            assert(res.ok, `dev server HTTP ${res.status}`);
            assert(
              /id=["']root["']|type=["']module["']/.test(html),
              'dev HTML missing app shell'
            );
            console.log('✓ vite dev served app HTML');
            finish();
          } catch (e) {
            finish(e instanceof Error ? e : new Error(String(e)));
          }
        })();
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('error', (e) => finish(e));
    setTimeout(() => {
      if (!ready) finish(new Error('vite did not become ready in time'));
    }, 25_000);
  });
}

void proveViteDev()
  .then(() => {
    const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    assert(pkg.dependencies?.react, 'react dep');
    assert(pkg.dependencies?.['@supabase/supabase-js'], 'supabase-js dep');
    console.log('\nSMOKE OK — Full App export installs, builds, and serves via Vite');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
