import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createNiskBuildConfig } from '@/lib/niskbuild-config';
import { applyExportWatermark } from '@/lib/export-policy';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportCleanZip, resolveProductGatingBypass } from '@/lib/tier-access-server';
import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';
import {
  buildRobotsTxt,
  buildSitemapXml,
  injectSeoIntoHtml,
} from '@/lib/seo-inject';
import { DEFAULT_SEO_SETTINGS, type ProjectSeoSettings } from '@/lib/seo-types';
import {
  buildFullAppNiskConfig,
  isFullAppExportFiles,
  prepareFullAppExport,
} from '@/lib/full-app-export';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required to export' }, { status: 401 });
    }

    const ownerBypass = await resolveProductGatingBypass(user.id);
    const tier = profile?.subscription_tier ?? 'free';
    const status = profile?.subscription_status ?? 'inactive';
    const cleanExport = canExportCleanZip(tier, status, ownerBypass);

    const body = await request.json();
    const {
      code,
      prompt,
      projectName,
      promptHistory,
      files,
      activeFile,
      seo,
      outputMode,
      backend,
    } = body as {
      code?: string;
      prompt?: string;
      projectName?: string;
      promptHistory?: unknown;
      files?: Record<string, string>;
      activeFile?: string;
      seo?: ProjectSeoSettings;
      outputMode?: 'simple' | 'full-app';
      backend?: { supabaseUrl?: string | null; connected?: boolean };
    };

    const filesMap =
      files && typeof files === 'object'
        ? (files as Record<string, string>)
        : ({} as Record<string, string>);

    const isFullApp =
      outputMode === 'full-app' || isFullAppExportFiles(filesMap);

    if (isFullApp) {
      if (!filesMap || Object.keys(filesMap).length === 0) {
        return NextResponse.json(
          { error: 'No Full App project files to export' },
          { status: 400 }
        );
      }

      const prepared = prepareFullAppExport({
        files: filesMap,
        projectName: projectName || prompt?.substring(0, 50) || 'NiskBuild Full App',
        prompt: prompt || '',
        backend: {
          connected: Boolean(backend?.connected && backend?.supabaseUrl),
          supabaseUrl: backend?.supabaseUrl ?? null,
        },
      });

      if (!cleanExport) {
        // Sandbox: stamp README only (HTML watermark does not apply to React trees).
        prepared.files['README.md'] =
          `> **Sandbox export** — Upgrade for clean ZIP branding. You still own the code.\n\n` +
          prepared.files['README.md'];
      }

      const config = buildFullAppNiskConfig({
        projectName: projectName || prompt?.substring(0, 50) || 'NiskBuild Full App',
        prompt: prompt || '',
        files: prepared.files,
        promptHistory: Array.isArray(promptHistory)
          ? (promptHistory as { prompt: string; timestamp: string; target?: string }[])
          : undefined,
        activeFile: activeFile || 'src/App.jsx',
      });

      const zip = new JSZip();
      const root = zip.folder(prepared.rootFolderName);
      root?.file('niskbuild.config.json', JSON.stringify(config, null, 2));
      for (const [path, content] of Object.entries(prepared.files)) {
        // Never pack a real .env if the model hallucinated one
        if (path === '.env' || path.endsWith('/.env')) continue;
        root?.file(path, content);
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const zipData = new Uint8Array(zipBuffer);

      return new NextResponse(zipData, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="niskbuild-full-app-${Date.now()}.zip"`,
          'X-NiskBuild-Export-Runtime': 'full-app',
          ...(cleanExport ? {} : { 'X-NiskBuild-Watermarked': '1' }),
        },
      });
    }

    // --- Simple (HTML) export path ---
    const { prepareShippableHtmlFiles } = await import('@/lib/ship-html');

    if (!code) {
      return NextResponse.json({ error: 'No code to export' }, { status: 400 });
    }

    const seoSettings: ProjectSeoSettings = seo
      ? { ...DEFAULT_SEO_SETTINGS, ...seo }
      : DEFAULT_SEO_SETTINGS;

    const cleanedCode = cleanGeneratedCode(code);
    let htmlWithSeo = injectSeoIntoHtml(cleanedCode, seoSettings);
    if (!cleanExport) {
      htmlWithSeo = applyExportWatermark(htmlWithSeo);
    }

    const config = createNiskBuildConfig({
      projectName: projectName || prompt?.substring(0, 50) || 'NiskBuild Project',
      prompt: prompt || '',
      code: htmlWithSeo,
      promptHistory: Array.isArray(promptHistory)
        ? (promptHistory as { prompt: string; timestamp: string; target?: string }[])
        : undefined,
      activeFile: activeFile || 'index.html',
    });

    if (Object.keys(filesMap).length > 0) {
      config.files = { ...config.files, ...filesMap };
      config.files['index.html'] = htmlWithSeo;
    } else {
      config.files['index.html'] = htmlWithSeo;
    }

    const ship = await prepareShippableHtmlFiles(config.files);
    config.files = ship.files;
    if (ship.fellBackToCdn) {
      console.error(
        '[api/export] Tailwind static compile fell back to CDN:',
        ship.compileError || '(no message)'
      );
    }

    const zip = new JSZip();
    const root = zip.folder('generated-app');

    root?.file('niskbuild.config.json', JSON.stringify(config, null, 2));

    root?.file(
      'README.md',
      `# NiskBuild Generated App\n\nGenerated from: "${prompt?.substring(0, 100) || 'Unknown prompt'}"\n\nDate: ${new Date().toISOString()}\n\n## Local Sync\nThis bundle includes \`niskbuild.config.json\` — drop the ZIP back into NiskBuild to restore prompt history.\n\n## Styles\nIf present, \`styles.css\` is compiled Tailwind CSS for the utility classes used in this project. Open \`index.html\` directly in a browser — no build step required.\n\n---\nBuilt with NiskBuild — Build anything. Own everything.\n`
    );

    for (const [path, content] of Object.entries(config.files)) {
      root?.file(path, content);
    }

    const siteBase = seoSettings.canonicalUrl?.trim() || 'https://example.com';
    if (seoSettings.sitemapEnabled && !seoSettings.noindex) {
      root?.file('sitemap.xml', buildSitemapXml(siteBase));
    }
    root?.file(
      'robots.txt',
      buildRobotsTxt(
        seoSettings.robotsEnabled && !seoSettings.noindex,
        seoSettings.sitemapEnabled ? `${siteBase.replace(/\/$/, '')}/sitemap.xml` : undefined
      )
    );

    root?.file('src/code.txt', code);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipData = new Uint8Array(zipBuffer);

    return new NextResponse(zipData, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="niskbuild-export-${Date.now()}.zip"`,
        'X-NiskBuild-Export-Runtime': 'html',
        'X-NiskBuild-Ship-Css': ship.fellBackToCdn ? 'cdn-fallback' : 'compiled',
        ...(ship.compileError
          ? {
              'X-NiskBuild-Ship-Css-Error': ship.compileError
                .slice(0, 200)
                .replace(/[\r\n]+/g, ' '),
            }
          : {}),
        ...(cleanExport ? {} : { 'X-NiskBuild-Watermarked': '1' }),
      },
    });
  } catch (error) {
    captureApiException(error);
    console.error('Export error:', error);
    return NextResponse.json(
      {
        error:
          'Failed to create ZIP file: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}
