"use client";

import Link from 'next/link';

type SavedProject = {
  id: string;
  title: string;
  prompt: string;
  generated_code: string;
  created_at: string;
};

type ProjectSort = 'newest' | 'oldest' | 'name';

type BuilderProjectsDrawerProps = {
  open: boolean;
  onClose: () => void;
  projects: SavedProject[];
  filteredProjects: SavedProject[];
  projectSearch: string;
  projectSort: ProjectSort;
  onSearchChange: (q: string) => void;
  onSortChange: (sort: ProjectSort) => void;
  onLoad: (project: SavedProject) => void;
  onDelete: (project: SavedProject, e: React.MouseEvent) => void;
};

export default function BuilderProjectsDrawer({
  open,
  onClose,
  projects,
  filteredProjects,
  projectSearch,
  projectSort,
  onSearchChange,
  onSortChange,
  onLoad,
  onDelete,
}: BuilderProjectsDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close projects"
      />
      <aside className="w-full max-w-md bg-nisk-card border-l border-nisk flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-nisk shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">My Projects</h2>
            <p className="text-[10px] text-nisk-muted mt-0.5">
              Manage on <Link href="/dashboard" className="text-[var(--accent-cyan)] hover:underline">Dashboard</Link>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-nisk-muted hover:text-white text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 border-b border-nisk flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="Search projects…"
            value={projectSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-nisk border border-nisk rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]"
          />
          <select
            value={projectSort}
            onChange={(e) => onSortChange(e.target.value as ProjectSort)}
            className="bg-nisk border border-nisk rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {projects.length === 0 ? (
            <p className="text-sm text-nisk-muted text-center py-8">
              No saved projects yet. Generate an app and use Actions → Save.
            </p>
          ) : filteredProjects.length === 0 ? (
            <p className="text-sm text-nisk-muted text-center py-8">No projects match your search.</p>
          ) : (
            <ul className="space-y-2">
              {filteredProjects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 p-3 rounded-xl border border-nisk bg-nisk-surface hover:border-[var(--primary)]/40 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => { onLoad(p); onClose(); }}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-medium text-white truncate">{p.title}</p>
                    <p className="text-[10px] text-nisk-muted mt-0.5">
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onDelete(p, e)}
                    className="shrink-0 px-2 py-1 text-xs text-nisk-muted hover:text-[var(--error)] rounded-lg border border-nisk"
                    aria-label={`Delete ${p.title}`}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
