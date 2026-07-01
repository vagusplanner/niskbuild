import 'server-only';

import { isExportableCode } from '@/lib/cleanGeneratedCode';
import {
  formatAuditReport,
  summarizeChecks,
  type AuditCheck,
} from '@/lib/builder-audit-shared';
import { listHtmlPages } from '@/lib/project-pages';
import type { ProjectSeoSettings } from '@/lib/seo-types';
import {
  canExportNative,
  canExportPwa,
  isPaidAndActive,
  isSandboxTier,
} from '@/lib/tier-config';

export type HtmlProjectAuditInput = {
  files: Record<string, string>;
  generatedCode?: string;
  activeFile?: string;
  seo?: ProjectSeoSettings;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  projectId?: string | null;
};

export type HtmlProjectAuditResult = {
  generatedAt: string;
  summary: ReturnType<typeof summarizeChecks>;
  checks: AuditCheck[];
  report: string;
  exportNotes: string[];
};

function htmlFiles(files: Record<string, string>): [string, string][] {
  return Object.entries(files).filter(([path]) => path.endsWith('.html'));
}

function extractInternalLinks(html: string): string[] {
  const links: string[] = [];
  const re = /href=["']([^"']+\.html[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    links.push(m[1].split('#')[0].split('?')[0]);
  }
  return links;
}

export function runHtmlProjectAudit(input: HtmlProjectAuditInput): HtmlProjectAuditResult {
  const checks: AuditCheck[] = [];
  const files = { ...input.files };
  const indexHtml = files['index.html'] || input.generatedCode || '';
  const tier = input.subscriptionTier || 'free';
  const status = input.subscriptionStatus || 'inactive';
  const seo = input.seo;

  const push = (
    id: string,
    area: string,
    label: string,
    status: AuditCheck['status'],
    detail: string
  ) => {
    checks.push({ id, area, label, status, detail });
  };

  // Core project
  push(
    'has-exportable',
    'Project',
    'Generated app ready',
    isExportableCode(indexHtml) ? 'pass' : 'fail',
    isExportableCode(indexHtml)
      ? 'index.html has exportable content'
      : 'Generate your app first — index.html is empty or placeholder'
  );

  push(
    'project-saved',
    'Project',
    'Saved to dashboard',
    input.projectId ? 'pass' : 'warn',
    input.projectId
      ? `Project ID ${input.projectId.slice(0, 8)}… — versions and restore available`
      : 'Save project to dashboard before export so you can restore versions'
  );

  // Pages
  const pages = htmlFiles(files);
  const pagePaths = new Set(pages.map(([p]) => p));

  if (pages.length === 0 && indexHtml) {
    pages.push(['index.html', indexHtml]);
    pagePaths.add('index.html');
  }

  push(
    'page-count',
    'Pages',
    'Multi-page project',
    pages.length > 1 ? 'pass' : 'info',
    pages.length > 1
      ? `${pages.length} HTML pages: ${pages.map(([p]) => p).join(', ')}`
      : 'Single-page app — add pages from the builder if you need more routes'
  );

  for (const [path, content] of pages) {
    const ok = content.trim().length > 80 && /<!DOCTYPE|html/i.test(content);
    push(
      `page-${path}`,
      'Pages',
      path,
      ok ? 'pass' : 'fail',
      ok ? `${content.length} chars` : 'Page empty or missing HTML structure'
    );
  }

  // index.html quality
  push(
    'viewport',
    'HTML quality',
    'Mobile viewport meta',
    /viewport/i.test(indexHtml) ? 'pass' : 'warn',
    /viewport/i.test(indexHtml)
      ? 'viewport meta tag found'
      : 'Add <meta name="viewport"> for mobile / PWA'
  );

  push(
    'title-tag',
    'HTML quality',
    'Document title',
    /<title>[^<]+<\/title>/i.test(indexHtml) ? 'pass' : 'warn',
    /<title>[^<]+<\/title>/i.test(indexHtml)
      ? 'Title tag present'
      : 'Add a <title> for SEO and App Store metadata'
  );

  const buttonCount = (indexHtml.match(/<button/gi) || []).length;
  const linkCount = (indexHtml.match(/<a\s/gi) || []).length;
  push(
    'interactive',
    'HTML quality',
    'Buttons & links',
    buttonCount + linkCount > 0 ? 'pass' : 'warn',
    `${buttonCount} button(s), ${linkCount} link(s) on index.html`
  );

  // Internal navigation
  const brokenLinks: string[] = [];
  for (const [path, content] of pages) {
    for (const href of extractInternalLinks(content)) {
      const normalized = href.replace(/^\.\//, '');
      if (normalized.startsWith('http')) continue;
      if (!pagePaths.has(normalized) && normalized !== 'index.html') {
        brokenLinks.push(`${path} → ${href}`);
      }
    }
  }
  push(
    'internal-links',
    'Navigation',
    'Internal page links',
    brokenLinks.length === 0 ? 'pass' : 'warn',
    brokenLinks.length === 0
      ? 'No broken .html links detected across pages'
      : `Check links: ${brokenLinks.slice(0, 4).join('; ')}${brokenLinks.length > 4 ? '…' : ''}`
  );

  // Assets
  const hasCss =
    !!files['styles.css']?.trim() ||
    /tailwind|stylesheet|<style/i.test(indexHtml);
  push(
    'styles',
    'Assets',
    'CSS / styling',
    hasCss ? 'pass' : 'warn',
    hasCss ? 'Styles present (file or inline/Tailwind)' : 'Add styles.css or Tailwind for polish'
  );

  const imgWithoutAlt = (indexHtml.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
  push(
    'img-alt',
    'Assets',
    'Image alt text',
    imgWithoutAlt === 0 ? 'pass' : 'warn',
    imgWithoutAlt === 0
      ? 'Images on index have alt attributes'
      : `${imgWithoutAlt} image(s) on index may be missing alt text`
  );

  // SEO
  if (seo) {
    push(
      'seo-title',
      'SEO',
      'SEO title',
      seo.title?.trim() ? 'pass' : 'warn',
      seo.title?.trim() ? seo.title : 'Set SEO title in inspector before export'
    );
    push(
      'seo-description',
      'SEO',
      'Meta description',
      seo.metaDescription?.trim() ? 'pass' : 'warn',
      seo.metaDescription?.trim() ? 'Description set' : 'Add meta description for search and sharing'
    );
    push(
      'seo-canonical',
      'SEO',
      'Canonical URL',
      seo.canonicalUrl?.trim() && !seo.canonicalUrl.includes('example.com')
        ? 'pass'
        : 'warn',
      seo.canonicalUrl?.trim()
        ? seo.canonicalUrl
        : 'Set production canonical URL (not example.com)'
    );
  } else {
    push('seo-block', 'SEO', 'SEO settings', 'warn', 'Open inspector → SEO tab and configure metadata');
  }

  // Export tiers
  push(
    'zip-export',
    'Export',
    'ZIP export',
    isPaidAndActive(tier, status) ? 'pass' : isSandboxTier(tier) ? 'info' : 'warn',
    isPaidAndActive(tier, status)
      ? 'Your plan allows clean ZIP export'
      : isSandboxTier(tier)
        ? 'Sandbox — watermarked export only; upgrade for clean ZIP'
        : 'Upgrade for clean ZIP export'
  );

  push(
    'pwa-export',
    'Export',
    'PWA / mobile web',
    canExportPwa(tier, status) ? 'pass' : 'warn',
    canExportPwa(tier, status)
      ? 'PWA export available on your plan'
      : 'Pro Worker+ required for PWA export'
  );

  push(
    'native-export',
    'Export',
    'App Store (native)',
    canExportNative(tier, status) ? 'pass' : 'info',
    canExportNative(tier, status)
      ? 'Agency+ — native export via Mac + Xcode'
      : 'App Store packaging needs Agency Studio or above'
  );

  push(
    'deploy-live',
    'Export',
    'Live preview deploy',
    isPaidAndActive(tier, status) ? 'pass' : 'info',
    isPaidAndActive(tier, status)
      ? 'Deploy live preview from builder menu'
      : 'Paid plan required for live preview links'
  );

  // Builder features (parity with VP audit)
  push(
    'cloud-ai',
    'Builder',
    'Cloud AI generation',
    'pass',
    'HTML builder uses Supabase project storage — edits persist in production (no disk write)'
  );

  push(
    'help-assistant',
    'Builder',
    'NiskBuild AI assistant',
    'pass',
    'Help assistant (?) available — plans, exports, troubleshooting'
  );

  push(
    'social-publisher',
    'Builder',
    'Social publisher',
    isPaidAndActive(tier, status) ? 'pass' : 'info',
    'Share to Social panel in builder menu (Buffer on connected plans)'
  );

  const exportNotes = [
    'Save project to dashboard, then export ZIP or PWA from the builder menu.',
    'Use Deploy for a shareable live preview link (paid plans).',
    'For App Store: export on your Mac with Xcode — not on Vercel servers.',
    'Test all pages in preview device sizes before client handoff.',
    'Privacy policy URL required for App Store — add link in footer or Settings page.',
  ];

  const summary = summarizeChecks(checks);
  const report = formatAuditReport('HTML project export audit', checks, exportNotes);

  return {
    generatedAt: new Date().toISOString(),
    summary,
    checks,
    report,
    exportNotes,
  };
}

/** Re-export for client-side page list hints */
export function auditPagePathsFromFiles(files: Record<string, string>): string[] {
  const asProjectFiles = Object.entries(files).map(([path, content]) => ({
    path,
    name: path,
    content,
    icon: '📄',
  }));
  return listHtmlPages(asProjectFiles).map((f) => f.path);
}
