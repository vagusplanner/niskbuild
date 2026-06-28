import 'server-only';

import fs from 'fs/promises';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import { copyAppTree, extractZipToDirectory } from '@/lib/app-import/extract-zip';
import {
  detectEntryFiles,
  detectFrameworkFromPackage,
  findAppRoot,
} from '@/lib/app-import/detect-framework';
import { normalizeImportedWorkspace } from '@/lib/app-import/normalize';
import { uploadImportedAppToStorage } from '@/lib/app-import/storage';
import { ensureUniqueSlug, slugifyAppTitle } from '@/lib/app-import/slugify';
import { importedAppSourceObjectPath } from '@/lib/storage/constants';
import { zipDirectoryToBuffer } from '@/lib/storage/zip-directory';
import type { AppImportInput, AppImportResult, DetectedFramework } from '@/lib/app-import/types';

const ROOT = process.cwd();
const IMPORTS_TMP = path.join(ROOT, 'tmp', 'app-imports');

function appendLog(lines: string[], line: string): string {
  return `${lines.join('')}${line.endsWith('\n') ? line : `${line}\n`}`;
}

async function loadTakenSlugs(admin: ReturnType<typeof createAdminClient>): Promise<Set<string>> {
  const taken = new Set<string>();
  const { data } = await admin.schema('firstparty').from('app_imports').select('slug');
  for (const row of data ?? []) {
    if (row && typeof row === 'object' && 'slug' in row && typeof row.slug === 'string') {
      taken.add(row.slug);
    }
  }
  return taken;
}

export async function runAppImportPipeline(params: {
  zipBuffer: Buffer;
  importedBy: string;
  input: AppImportInput;
}): Promise<AppImportResult> {
  const admin = createAdminClient();
  const logLines: string[] = [];
  const title = params.input.title.trim() || 'Imported App';
  const sourceLayer = params.input.sourceLayer ?? 'subscriber';
  const baseSlug = slugifyAppTitle(title);
  const takenSlugs = await loadTakenSlugs(admin);
  const slug = ensureUniqueSlug(baseSlug, takenSlugs);
  const storagePath = importedAppSourceObjectPath(slug);
  const legacyWorkspacePath = `imported-apps/${slug}`;

  const { data: importRow, error: insertError } = await admin
    .schema('firstparty')
    .from('app_imports')
    .insert({
      slug,
      title,
      status: 'extracting',
      source_layer: sourceLayer,
      workspace_path: legacyWorkspacePath,
      imported_by: params.importedBy,
      log: `[${new Date().toISOString()}] Import started\n`,
    })
    .select('id')
    .single();

  if (insertError || !importRow) {
    throw new Error(insertError?.message || 'Failed to create import record');
  }

  const importId = importRow.id as string;
  const tmpRoot = path.join(IMPORTS_TMP, importId);
  const tmpExtract = path.join(tmpRoot, 'extract');
  const tmpWorkspace = path.join(tmpRoot, 'workspace');

  try {
    logLines.push(`[${new Date().toISOString()}] Extracting ZIP…\n`);
    await extractZipToDirectory(params.zipBuffer, tmpExtract);

    const appRoot = await findAppRoot(tmpExtract);
    if (!appRoot) {
      throw new Error('No package.json or index.html found in uploaded archive');
    }

    let framework: DetectedFramework = 'unknown';
    try {
      const pkgRaw = await fs.readFile(path.join(appRoot, 'package.json'), 'utf8');
      framework = detectFrameworkFromPackage(JSON.parse(pkgRaw) as Record<string, unknown>);
    } catch {
      try {
        await fs.access(path.join(appRoot, 'index.html'));
        framework = 'static';
      } catch {
        framework = 'unknown';
      }
    }

    await admin
      .schema('firstparty')
      .from('app_imports')
      .update({ status: 'normalizing', framework, log: appendLog(logLines, 'Normalizing workspace…') })
      .eq('id', importId);

    logLines.push(`[${new Date().toISOString()}] Detected framework: ${framework}\n`);
    const fileCount = await copyAppTree(appRoot, tmpWorkspace);
    const entryFiles = await detectEntryFiles(tmpWorkspace, framework);

    const { manifest, notes } = await normalizeImportedWorkspace({
      workspaceRoot: tmpWorkspace,
      slug,
      title,
      framework,
      sourceLayer,
      entryFiles,
      fileCount,
      storagePath,
    });

    for (const note of notes) {
      logLines.push(`[${new Date().toISOString()}] ${note}\n`);
    }

    logLines.push(`[${new Date().toISOString()}] Archiving normalized workspace…\n`);
    const sourceZip = await zipDirectoryToBuffer(tmpWorkspace);

    logLines.push(`[${new Date().toISOString()}] Uploading to imported-apps/${storagePath}…\n`);
    await uploadImportedAppToStorage({ slug, sourceZip, manifest });

    let listingId: string | null = null;
    let appRegistryId: string | null = null;

    const appSource = {
      layer: sourceLayer,
      importId,
      appSlug: slug,
      framework,
      storagePath,
      storageBucket: 'imported-apps',
      category: 'imported',
      author: 'Imported',
      complexity: 5,
      downloads: 0,
      featured: false,
      prompt: `Imported ${framework} app — stored at imported-apps/${storagePath}`,
    };

    const { data: listing, error: listingError } = await admin
      .schema('marketplace')
      .from('listings')
      .insert({
        title,
        description: params.input.description?.trim() || `Imported ${framework} application`,
        price_cents: params.input.priceCents ?? 0,
        listing_type: 'template',
        seller_user_id: params.importedBy,
        is_active: params.input.publishActive ?? false,
        app_source: appSource,
      })
      .select('id')
      .single();

    if (listingError) {
      throw new Error(`Marketplace listing failed: ${listingError.message}`);
    }
    listingId = listing.id as string;
    logLines.push(`[${new Date().toISOString()}] Created marketplace listing ${listingId}\n`);

    if (params.input.registerFirstparty || sourceLayer === 'firstparty') {
      const { data: registry, error: registryError } = await admin
        .schema('firstparty')
        .from('app_registry')
        .insert({
          app_name: title,
          status: 'draft',
          app_slug: slug,
        })
        .select('id')
        .single();

      if (registryError) {
        logLines.push(`[${new Date().toISOString()}] Registry note: ${registryError.message}\n`);
      } else {
        appRegistryId = registry.id as string;
        logLines.push(`[${new Date().toISOString()}] Registered first-party app ${appRegistryId}\n`);
      }
    }

    const finalLog = appendLog(logLines, `[${new Date().toISOString()}] Import completed`);
    await admin
      .schema('firstparty')
      .from('app_imports')
      .update({
        status: 'completed',
        listing_id: listingId,
        app_registry_id: appRegistryId,
        manifest,
        storage_path: storagePath,
        log: finalLog,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importId);

    return {
      importId,
      slug,
      title,
      status: 'completed',
      framework,
      storagePath,
      listingId,
      appRegistryId,
      manifest,
      log: finalLog,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failLog = appendLog(logLines, `[${new Date().toISOString()}] FAILED: ${message}`);
    await admin
      .schema('firstparty')
      .from('app_imports')
      .update({
        status: 'failed',
        error_message: message,
        log: failLog,
      })
      .eq('id', importId);
    throw error;
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
  }
}

export async function listAppImports(limit = 25) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('app_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
