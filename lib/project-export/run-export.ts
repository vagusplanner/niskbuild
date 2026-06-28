import 'server-only';

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import JSZip from 'jszip';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';
import { buildNativeZip, slugifyFilename } from '@/lib/pwa-generator';
import { createDistArchiveBuffer, materializeDistFromNativeZip } from '@/lib/project-export/dist-archive';
import { uploadProjectExportZip } from '@/lib/project-export/export-storage';
import {
  appendProjectExportLog,
  failProjectExportJob,
  getProjectExportJob,
  updateProjectExportJob,
} from '@/lib/project-export/jobs';

const ROOT = process.cwd();
const EXPORTS_ROOT = path.join(ROOT, 'tmp', 'project-exports');

export type ProjectExportInput = {
  id: string;
  title: string;
  prompt: string;
  generated_code: string;
  blueprint_json: ComponentBlueprint | null;
  bundle_id: string | null;
};

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  onChunk: (text: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, shell: false });
    proc.stdout.on('data', (buf: Buffer) => onChunk(buf.toString()));
    proc.stderr.on('data', (buf: Buffer) => onChunk(buf.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });
  });
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function logLine(jobId: string, line: string): Promise<void> {
  await appendProjectExportLog(jobId, line.endsWith('\n') ? line : `${line}\n`);
}

async function ensureCapacitorShell(
  capDir: string,
  appId: string,
  appName: string
): Promise<void> {
  await fs.mkdir(capDir, { recursive: true });
  const pkgPath = path.join(capDir, 'package.json');
  if (!(await pathExists(pkgPath))) {
    await fs.writeFile(
      pkgPath,
      `${JSON.stringify(
        {
          name: `${slugifyFilename(appName)}-mobile`,
          private: true,
          version: '1.0.0',
          scripts: { sync: 'cap sync', open: 'cap open ios' },
          dependencies: {
            '@capacitor/core': '^7.2.0',
            '@capacitor/cli': '^7.2.0',
            '@capacitor/ios': '^7.2.0',
            '@capacitor/android': '^7.2.0',
          },
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }

  await fs.writeFile(
    path.join(capDir, 'capacitor.config.json'),
    `${JSON.stringify(
      {
        appId,
        appName,
        webDir: 'www',
        server: { androidScheme: 'https' },
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  if (!(await pathExists(path.join(capDir, 'node_modules')))) {
    await runCommand('npm', ['install'], capDir, () => {});
  }
}

async function uploadDistArchive(params: {
  jobId: string;
  projectId: string;
  userId: string;
  distDir: string;
}): Promise<string> {
  const archiveBuffer = await createDistArchiveBuffer(params.distDir);
  const storagePath = await uploadProjectExportZip({
    userId: params.userId,
    projectId: params.projectId,
    jobId: params.jobId,
    zipBuffer: archiveBuffer,
  });
  await logLine(
    params.jobId,
    `[${new Date().toISOString()}] Uploaded dist archive to project-exports/${storagePath}\n`
  );
  return storagePath;
}

export async function runProjectExportPipeline(
  jobId: string,
  project: ProjectExportInput,
  downloadApiPath: string,
  userId: string
): Promise<void> {
  const workDir = path.join(EXPORTS_ROOT, jobId);
  const capDir = path.join(workDir, 'capacitor');
  const wwwDir = path.join(capDir, 'www');
  const distDir = path.join(workDir, 'dist');
  const zipPath = path.join(workDir, 'native-export.zip');
  const appName = project.title?.trim() || 'NiskBuild App';
  const appId =
    project.bundle_id?.trim() ||
    `com.niskbuild.${project.id.replace(/-/g, '').slice(0, 12)}`;
  const isDarwin = process.platform === 'darwin';

  try {
    await fs.mkdir(workDir, { recursive: true });
    await updateProjectExportJob(jobId, { status: 'building' }, project.id);
    await logLine(jobId, `[${new Date().toISOString()}] Preparing web bundle…`);

    const zipBuffer = await buildNativeZip({
      id: project.id,
      title: appName,
      prompt: project.prompt || '',
      generated_code: project.generated_code || '',
      blueprint_json: project.blueprint_json,
    });

    await fs.writeFile(zipPath, zipBuffer);
    await materializeDistFromNativeZip(zipBuffer, distDir);
    await logLine(jobId, `[${new Date().toISOString()}] Dist folder materialized for archiver.\n`);

    if (isDarwin) {
      await updateProjectExportJob(jobId, { status: 'syncing' }, project.id);
      await logLine(jobId, `[${new Date().toISOString()}] Syncing Capacitor (macOS)…`);

      await ensureCapacitorShell(capDir, appId, appName);

      const zip = await JSZip.loadAsync(zipBuffer);
      const indexHtml = await zip.file('index.html')?.async('string');
      if (!indexHtml) {
        throw new Error('Export ZIP missing index.html');
      }

      await fs.rm(wwwDir, { recursive: true, force: true });
      await fs.mkdir(wwwDir, { recursive: true });
      await fs.writeFile(path.join(wwwDir, 'index.html'), indexHtml, 'utf8');

      const capConfig = await zip.file('capacitor.config.json')?.async('string');
      if (capConfig) {
        await fs.writeFile(path.join(capDir, 'capacitor.config.json'), capConfig, 'utf8');
      }

      const iosDir = path.join(capDir, 'ios');
      if (!(await pathExists(iosDir))) {
        await runCommand('npx', ['cap', 'add', 'ios'], capDir, (chunk) => {
          void appendProjectExportLog(jobId, chunk);
        });
      }

      await runCommand('npx', ['cap', 'sync', 'ios'], capDir, (chunk) => {
        void appendProjectExportLog(jobId, chunk);
      });

      await runCommand('npx', ['cap', 'sync', 'android'], capDir, (chunk) => {
        void appendProjectExportLog(jobId, chunk);
      });

      const iosWorkspace = path.join(
        'tmp',
        'project-exports',
        jobId,
        'capacitor',
        'ios',
        'App',
        'App.xcworkspace'
      );
      const storagePath = await uploadDistArchive({
        jobId,
        projectId: project.id,
        userId,
        distDir,
      });

      const job = await getProjectExportJob(jobId);
      const log = `${job?.log ?? ''}\n[${new Date().toISOString()}] Capacitor sync complete — ready for Xcode.\n`;

      await updateProjectExportJob(
        jobId,
        {
          status: 'ready',
          log,
          download_url: downloadApiPath,
          storage_path: storagePath,
          capacitor_root: path.relative(ROOT, capDir),
          ios_workspace: iosWorkspace,
          finished_at: new Date().toISOString(),
        },
        project.id
      );
      return;
    }

    const storagePath = await uploadDistArchive({
      jobId,
      projectId: project.id,
      userId,
      distDir,
    });

    const job = await getProjectExportJob(jobId);
    const log = `${job?.log ?? ''}\n[${new Date().toISOString()}] ZIP-only export uploaded — finish on Mac with npx cap sync ios.\n`;

    await updateProjectExportJob(
      jobId,
      {
        status: 'ready_zip_only',
        log,
        download_url: downloadApiPath,
        storage_path: storagePath,
        finished_at: new Date().toISOString(),
      },
      project.id
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failProjectExportJob(jobId, message, project.id);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function startProjectExportJob(
  jobId: string,
  project: ProjectExportInput,
  downloadApiPath: string,
  userId: string
): void {
  void runProjectExportPipeline(jobId, project, downloadApiPath, userId);
}

/** @deprecated Local artifact fallback — prefer storage_path on the job row. */
export function projectExportArtifactPath(jobId: string): string {
  return path.join(EXPORTS_ROOT, jobId, 'native-export.zip');
}
