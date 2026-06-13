import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createNiskBuildConfig } from '@/lib/niskbuild-config';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportCleanZip } from '@/lib/tier-config';
import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';
import {
  buildRobotsTxt,
  buildSitemapXml,
  injectSeoIntoHtml,
} from '@/lib/seo-inject';
import { DEFAULT_SEO_SETTINGS, type ProjectSeoSettings } from '@/lib/seo-types';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required to export' }, { status: 401 });
    }

    const tier = profile?.subscription_tier ?? 'free';
    const status = profile?.subscription_status ?? 'inactive';

    if (!canExportCleanZip(tier, status)) {
      return NextResponse.json(
        {
          error: 'Clean ZIP export requires an active paid plan. Sandbox tier is preview-only.',
          upgrade: true,
          tier,
        },
        { status: 403 }
      );
    }

    const { code, prompt, projectName, promptHistory, files, activeFile, seo } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'No code to export' }, { status: 400 });
    }

    const seoSettings: ProjectSeoSettings = seo
      ? { ...DEFAULT_SEO_SETTINGS, ...seo }
      : DEFAULT_SEO_SETTINGS;

    const cleanedCode = cleanGeneratedCode(code);
    const htmlWithSeo = injectSeoIntoHtml(cleanedCode, seoSettings);

    const config = createNiskBuildConfig({
      projectName: projectName || prompt?.substring(0, 50) || 'NiskBuild Project',
      prompt: prompt || '',
      code: htmlWithSeo,
      promptHistory,
      activeFile: activeFile || 'index.html',
    });

    if (files && typeof files === 'object') {
      config.files = { ...config.files, ...files };
      config.files['index.html'] = htmlWithSeo;
    } else {
      config.files['index.html'] = htmlWithSeo;
    }

    const zip = new JSZip();
    const root = zip.folder('generated-app');

    root?.file('niskbuild.config.json', JSON.stringify(config, null, 2));

    root?.file(
      'README.md',
      `# NiskBuild Generated App\n\nGenerated from: "${prompt?.substring(0, 100) || 'Unknown prompt'}"\n\nDate: ${new Date().toISOString()}\n\n## Local Sync\nThis bundle includes \`niskbuild.config.json\` — drop the ZIP back into NiskBuild to restore prompt history.\n\n---\nBuilt with NiskBuild — Build anything. Own everything.\n`
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
      },
    });
  } catch (error) {
    captureApiException(error);
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to create ZIP file: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
