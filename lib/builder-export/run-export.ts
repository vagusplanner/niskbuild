import 'server-only';

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import type { BuilderExportAppConfig } from '@/lib/builder-export/types';
import {
  appendExportJobLog,
  failExportJob,
  getExportJob,
  updateExportJob,
} from '@/lib/builder-export/jobs';

const ROOT = process.cwd();

function abs(relative: string): string {
  return path.join(ROOT, relative);
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string>,
  onChunk: (text: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: false,
    });

    proc.stdout.on('data', (buf: Buffer) => onChunk(buf.toString()));
    proc.stderr.on('data', (buf: Buffer) => onChunk(buf.toString()));

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });
  });
}

async function ensureCapacitorProject(config: BuilderExportAppConfig): Promise<void> {
  const capDir = abs(config.capacitorDir);
  await fs.mkdir(capDir, { recursive: true });

  const pkgPath = path.join(capDir, 'package.json');
  if (!(await pathExists(pkgPath))) {
    await writeJson(pkgPath, {
      name: `${config.appSlug}-mobile`,
      private: true,
      version: '1.0.0',
      scripts: {
        sync: 'cap sync',
        open: 'cap open ios',
      },
      dependencies: {
        '@capacitor/core': '^7.2.0',
        '@capacitor/cli': '^7.2.0',
        '@capacitor/ios': '^7.2.0',
        '@capacitor/android': '^7.2.0',
      },
    });
  }

  await writeJson(path.join(capDir, 'capacitor.config.json'), {
    appId: config.capacitorAppId,
    appName: config.capacitorAppName,
    webDir: 'www',
    server: { androidScheme: 'https' },
  });

  const nodeModules = path.join(capDir, 'node_modules');
  if (!(await pathExists(nodeModules))) {
    await runCommand('npm', ['install'], capDir, {}, () => {});
  }
}

async function logLine(jobId: string, line: string): Promise<void> {
  await appendExportJobLog(jobId, line.endsWith('\n') ? line : `${line}\n`);
}

export async function runBuilderExportPipeline(
  jobId: string,
  config: BuilderExportAppConfig
): Promise<void> {
  const packageDir = abs(config.packageDir);
  const distPath = path.join(packageDir, config.distDir);
  const capDir = abs(config.capacitorDir);
  const wwwDir = path.join(capDir, 'www');
  const iosDir = path.join(capDir, 'ios');
  const iosWorkspace = path.join(config.capacitorDir, 'ios', 'App', 'App.xcworkspace');

  try {
    if (!(await pathExists(packageDir))) {
      throw new Error(`App package not found: ${config.packageDir}`);
    }

    await logLine(jobId, `[${new Date().toISOString()}] Building web bundle in ${config.packageDir}…`);

    await runCommand(
      'npm',
      ['run', 'build'],
      packageDir,
      config.buildEnv ?? {},
      (chunk) => {
        void appendExportJobLog(jobId, chunk);
      }
    );

    const indexHtml = path.join(distPath, 'index.html');
    if (!(await pathExists(indexHtml))) {
      throw new Error(`Build did not produce ${config.distDir}/index.html`);
    }

    await updateExportJob(jobId, { status: 'syncing' });
    await logLine(jobId, `[${new Date().toISOString()}] Web bundle ready — syncing Capacitor…`);

    await ensureCapacitorProject(config);

    await fs.rm(wwwDir, { recursive: true, force: true });
    await copyDir(distPath, wwwDir);

    if (!(await pathExists(iosDir))) {
      await logLine(jobId, `[${new Date().toISOString()}] Adding iOS platform…`);
      await runCommand('npx', ['cap', 'add', 'ios'], capDir, {}, (chunk) => {
        void appendExportJobLog(jobId, chunk);
      });
    }

    await logLine(jobId, `[${new Date().toISOString()}] Running cap sync ios…`);
    await runCommand('npx', ['cap', 'sync', 'ios'], capDir, {}, (chunk) => {
      void appendExportJobLog(jobId, chunk);
    });

    await logLine(jobId, `[${new Date().toISOString()}] Running cap sync android…`);
    await runCommand('npx', ['cap', 'sync', 'android'], capDir, {}, (chunk) => {
      void appendExportJobLog(jobId, chunk);
    });

    const job = await getExportJob(jobId);
    const log = `${job?.log ?? ''}\n[${new Date().toISOString()}] Export ready for Xcode.\n`;

    await updateExportJob(jobId, {
      status: 'ready_for_xcode',
      log,
      capacitor_root: config.capacitorDir,
      ios_workspace: iosWorkspace,
      finished_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failExportJob(jobId, message);
  }
}

export function startBuilderExportJob(jobId: string, config: BuilderExportAppConfig): void {
  void runBuilderExportPipeline(jobId, config);
}
