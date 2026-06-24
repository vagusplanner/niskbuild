'use client';

import type { ProjectFile } from '@/lib/project-files';

type BuilderPreviewPageNavProps = {
  projectFiles: ProjectFile[];
  activeFile: string;
  onSelectPage: (path: string) => void;
};

function pageLabel(path: string) {
  const base = path.replace(/\.(html|htm)$/i, '');
  if (base === 'index') return 'Home';
  return base.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BuilderPreviewPageNav({
  projectFiles,
  activeFile,
  onSelectPage,
}: BuilderPreviewPageNavProps) {
  const pages = projectFiles.filter((f) => /\.html?$/i.test(f.path));

  if (pages.length <= 1) return null;

  return (
    <nav
      aria-label="App pages"
      className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b-2 border-[var(--border)] bg-[var(--card-bg)] overflow-x-auto scrollbar-hide"
    >
      <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] shrink-0">
        Pages
      </span>
      {pages.map((file) => {
        const active = activeFile === file.path;
        return (
          <button
            key={file.path}
            type="button"
            onClick={() => onSelectPage(file.path)}
            className={`shrink-0 px-4 py-2 text-sm font-semibold border-2 transition-all ${
              active
                ? 'border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--accent-teal-bright)] shadow-[3px_3px_0_rgba(139,90,43,0.25)]'
                : 'border-[var(--border)] text-[var(--foreground)]/70 hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]'
            }`}
            title={file.path}
          >
            {pageLabel(file.path)}
          </button>
        );
      })}
    </nav>
  );
}
