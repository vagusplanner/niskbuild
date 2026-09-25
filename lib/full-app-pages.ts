/**
 * Full App (React) route page helpers — distinct from Simple HTML page tabs.
 */

import type { ProjectFile } from '@/lib/project-files';
import { iconForProjectPath } from '@/lib/full-app-bundle';

export type FullAppRoutePage = {
  /** Source file path, e.g. src/pages/Home.jsx */
  filePath: string;
  /** Client route path, e.g. / or /habits */
  routePath: string;
  /** UI label, e.g. Home */
  label: string;
};

const PAGE_FILE_RE = /^src\/pages\/([^/]+)\.(jsx|tsx)$/i;

export function reactPageDisplayLabel(filePath: string): string {
  const m = filePath.match(PAGE_FILE_RE);
  const base = m?.[1] || filePath.split('/').pop()?.replace(/\.(jsx|tsx)$/i, '') || filePath;
  if (/^index$/i.test(base) || /^home$/i.test(base)) return 'Home';
  return base.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function routePathForPageFile(filePath: string): string {
  const m = filePath.match(PAGE_FILE_RE);
  const base = m?.[1] || '';
  if (!base || /^index$/i.test(base) || /^home$/i.test(base)) return '/';
  return '/' + base.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/_/g, '-');
}

/** Pages that participate in the Full App route chrome (src/pages/*). */
export function listFullAppRoutePages(files: ProjectFile[]): FullAppRoutePage[] {
  return files
    .filter((f) => PAGE_FILE_RE.test(f.path))
    .map((f) => ({
      filePath: f.path,
      routePath: routePathForPageFile(f.path),
      label: reactPageDisplayLabel(f.path),
    }))
    .sort((a, b) => {
      if (a.routePath === '/') return -1;
      if (b.routePath === '/') return 1;
      return a.label.localeCompare(b.label);
    });
}

function slugifyComponentName(name: string): string {
  const parts = name
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .split(/[\s-_]+/)
    .filter(Boolean);
  if (parts.length === 0) return 'Page';
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
}

function slugifyRouteSegment(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page';
}

function findRoutesFile(files: ProjectFile[]): ProjectFile | null {
  return (
    files.find((f) => /^src\/routes\.(jsx|tsx)$/i.test(f.path)) ||
    files.find((f) => /^src\/App\.(jsx|tsx)$/i.test(f.path)) ||
    null
  );
}

function pageStub(componentName: string, label: string): string {
  return `export default function ${componentName}() {
  return (
    <section>
      <h1>${label}</h1>
      <p>New page — describe what you want here in a prompt to fill it in.</p>
    </section>
  );
}
`;
}

/**
 * Add src/pages/Name.jsx and wire a <Route> into src/routes.jsx (or App.jsx).
 */
export function addFullAppRoutePage(
  files: ProjectFile[],
  name: string
): { files: ProjectFile[]; filePath: string; routePath: string; label: string } | null {
  const label = name.trim();
  if (!label) return null;

  const componentName = slugifyComponentName(label);
  const segment = slugifyRouteSegment(label);
  if (segment === 'home' || segment === 'index') return null;

  const filePath = `src/pages/${componentName}.jsx`;
  if (files.some((f) => f.path === filePath)) return null;

  const routePath = '/' + segment;
  const routesFile = findRoutesFile(files);
  if (!routesFile) return null;

  let content = routesFile.content;
  const importLine = `import ${componentName} from './pages/${componentName}.jsx';`;
  if (!content.includes(importLine) && !content.includes(`from './pages/${componentName}`)) {
    // Insert after last import
    const importMatches = [...content.matchAll(/^import .+$/gm)];
    if (importMatches.length > 0) {
      const last = importMatches[importMatches.length - 1];
      const idx = (last.index ?? 0) + last[0].length;
      content = content.slice(0, idx) + '\n' + importLine + content.slice(idx);
    } else {
      content = importLine + '\n' + content;
    }
  }

  const routeLine = `      <Route path="${routePath}" element={<${componentName} />} />`;
  if (!content.includes(`path="${routePath}"`) && !content.includes(`path='${routePath}'`)) {
    if (/<\/Routes>/i.test(content)) {
      content = content.replace(/<\/Routes>/i, `${routeLine}\n    </Routes>`);
    } else if (/<Routes>[\s\S]*$/i.test(content)) {
      content = content.replace(/<Routes>/i, `<Routes>\n${routeLine}`);
    } else {
      return null;
    }
  }

  const stub: ProjectFile = {
    path: filePath,
    name: `${componentName}.jsx`,
    content: pageStub(componentName, label),
    icon: iconForProjectPath(filePath),
  };

  const next = files.map((f) =>
    f.path === routesFile.path ? { ...f, content } : f
  );
  next.push(stub);
  next.sort((a, b) => a.path.localeCompare(b.path));

  return { files: next, filePath, routePath, label: reactPageDisplayLabel(filePath) };
}
