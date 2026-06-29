import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';
import type { ProjectFile } from '@/lib/project-files';

export type ProjectPageContext = {
  activePage: string;
  pageLabel: string;
  allPages: string[];
  projectTitle?: string;
  primaryHeading?: string;
  businessName?: string;
  siteKind?: string;
  isExistingProject: boolean;
};

const HTML_PAGE_RE = /\.html?$/i;

export function isHtmlPage(path: string): boolean {
  return HTML_PAGE_RE.test(path);
}

export function listHtmlPages(files: ProjectFile[]): ProjectFile[] {
  return files.filter((f) => isHtmlPage(f.path));
}

export function pageDisplayLabel(path: string): string {
  const base = path.replace(/^pages\//, '').replace(/\.(html|htm)$/i, '');
  if (base === 'index') return 'Home';
  return base.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function slugifyPageFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const file = slug === 'home' || slug === 'index' ? 'index.html' : `${slug}.html`;
  return file.startsWith('pages/') ? file : `pages/${file}`;
}

function extractTag(html: string, tag: string): string | undefined {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]{1,120})</${tag}>`, 'i'));
  return m?.[1]?.trim();
}

function detectSiteKind(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/restaurant|menu|cafe|food|dining/.test(t)) return 'restaurant';
  if (/shop|store|cart|ecommerce|product|checkout/.test(t)) return 'ecommerce';
  if (/saas|pricing|subscription|dashboard|startup/.test(t)) return 'saas';
  if (/portfolio|photographer|gallery|creative/.test(t)) return 'portfolio';
  if (/booking|appointment|calendar|schedule/.test(t)) return 'booking';
  if (/fitness|gym|workout|health/.test(t)) return 'fitness';
  if (/blog|article|newsletter/.test(t)) return 'blog';
  return undefined;
}

export function inferProjectContext(params: {
  files: ProjectFile[];
  activePage: string;
  generatedCode: string;
  businessName?: string | null;
  lastPrompt?: string;
}): ProjectPageContext {
  const pages = listHtmlPages(params.files);
  const indexContent =
    params.files.find((f) => f.path === 'index.html')?.content?.trim() ||
    params.generatedCode;
  const activeContent =
    params.files.find((f) => f.path === params.activePage)?.content?.trim() ||
    (params.activePage === 'index.html' ? params.generatedCode : '');

  const sample = `${indexContent}\n${activeContent}\n${params.lastPrompt ?? ''}`;
  const projectTitle = extractTag(indexContent, 'title') || extractTag(activeContent, 'title');
  const primaryHeading =
    extractTag(indexContent, 'h1') || extractTag(activeContent, 'h1') || projectTitle;

  return {
    activePage: params.activePage,
    pageLabel: pageDisplayLabel(params.activePage),
    allPages: pages.map((p) => p.path),
    projectTitle,
    primaryHeading,
    businessName: params.businessName ?? undefined,
    siteKind: detectSiteKind(sample),
    isExistingProject: indexContent.length > 200 && indexContent.includes('<'),
  };
}

function extractHeadBlock(html: string): string {
  const m = html.match(/<head[\s\S]*?<\/head>/i);
  if (m) return m[0];
  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NiskBuild App</title>
</head>`;
}

function extractNavBlock(html: string): string {
  const m = html.match(/<nav[\s\S]*?<\/nav>/i);
  return m?.[0] ?? '';
}

export function createPageScaffold(pagePath: string, indexHtml: string): string {
  const label = pageDisplayLabel(pagePath);
  const head = extractHeadBlock(indexHtml);
  const nav = extractNavBlock(indexHtml);
  const title = label === 'Home' ? 'Home' : label;

  return `<!DOCTYPE html>
<html lang="en">
${head.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)}
<body>
${nav}
<main style="max-width:960px;margin:0 auto;padding:2rem 1.5rem;">
  <h1>${title}</h1>
  <p style="opacity:0.85;margin-top:0.75rem;">Describe this page in the prompt — e.g. “Fill the ${title} page with content matching the rest of the site.”</p>
</main>
</body>
</html>`;
}

export function getPreviewHtmlForPage(
  activePage: string,
  files: ProjectFile[],
  generatedCode: string
): string {
  const content =
    files.find((f) => f.path === activePage)?.content?.trim() ||
    (activePage === 'index.html' ? generatedCode : '');
  if (!content) {
    return `<div style="padding:2rem;text-align:center;color:#94A3B8;font-family:system-ui,sans-serif">
      <p>No content for <strong>${pageDisplayLabel(activePage)}</strong> yet.</p>
      <p style="margin-top:0.5rem;font-size:14px;">Use the prompt to generate this page.</p>
    </div>`;
  }
  return cleanGeneratedCode(content);
}

export function buildPageScopedPrompt(userPrompt: string, ctx: ProjectPageContext): string {
  if (!ctx.isExistingProject) return userPrompt;

  const others =
    ctx.allPages.filter((p) => p !== ctx.activePage).join(', ') || 'none yet';

  return `MULTI-PAGE PROJECT — edit one HTML file only.

Project: ${ctx.businessName || ctx.projectTitle || ctx.primaryHeading || 'User app'}
Site type: ${ctx.siteKind || 'website'}
Active page: ${ctx.pageLabel} (${ctx.activePage})
Other pages: ${others}

Rules:
- Return ONE complete HTML document for ${ctx.activePage} only (<!DOCTYPE html> … </html>).
- Match existing colors, typography, spacing, and navigation from the project.
- Link nav items to sibling pages (${others}) using relative paths.
- Do not output markdown fences or explanations.

User request:
${userPrompt}`;
}

export function mergeGeneratedIntoFiles(
  files: ProjectFile[],
  activePage: string,
  rawCode: string
): ProjectFile[] {
  const cleaned = cleanGeneratedCode(rawCode);
  const exists = files.some((f) => f.path === activePage);

  if (exists) {
    return files.map((f) => (f.path === activePage ? { ...f, content: cleaned } : f));
  }

  return [
    ...files,
    {
      path: activePage,
      name: activePage.split('/').pop() || activePage,
      content: cleaned,
      icon: '📄',
    },
  ];
}

export function renameProjectPage(
  files: ProjectFile[],
  oldPath: string,
  newDisplayName: string
): { files: ProjectFile[]; newPath: string } | null {
  if (oldPath === 'index.html') return null;
  const newPath = slugifyPageFilename(newDisplayName);
  if (files.some((f) => f.path === newPath && f.path !== oldPath)) return null;

  const updated = files.map((f) =>
    f.path === oldPath
      ? {
          ...f,
          path: newPath,
          name: newPath.split('/').pop() || newPath,
        }
      : f
  );
  return { files: updated, newPath };
}

export function deleteProjectPage(files: ProjectFile[], path: string): ProjectFile[] | null {
  if (path === 'index.html') return null;
  if (!files.some((f) => f.path === path)) return null;
  return files.filter((f) => f.path !== path);
}
