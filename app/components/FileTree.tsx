"use client";

import type { ProjectFile } from '@/lib/project-files';

interface FileTreeProps {
  files: ProjectFile[];
  activePath: string;
  onSelect: (path: string) => void;
}

export default function FileTree({ files, activePath, onSelect }: FileTreeProps) {
  const folders = new Map<string, ProjectFile[]>();

  for (const file of files) {
    const parts = file.path.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder)!.push(file);
  }

  const rootFiles = folders.get('') || [];
  const nestedFolders = [...folders.keys()].filter((k) => k !== '').sort();

  return (
    <div className="py-2 text-xs">
      <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-nisk-muted">Project</p>
      {rootFiles.map((file) => (
        <FileRow key={file.path} file={file} active={activePath === file.path} onSelect={onSelect} depth={0} />
      ))}
      {nestedFolders.map((folder) => (
        <div key={folder}>
          <p className="px-3 py-1.5 text-nisk-muted font-mono text-[11px]">📁 {folder}</p>
          {(folders.get(folder) || []).map((file) => (
            <FileRow key={file.path} file={file} active={activePath === file.path} onSelect={onSelect} depth={1} />
          ))}
        </div>
      ))}
    </div>
  );
}

function FileRow({
  file,
  active,
  onSelect,
  depth,
}: {
  file: ProjectFile;
  active: boolean;
  onSelect: (path: string) => void;
  depth: number;
}) {
  return (
    <button
      onClick={() => onSelect(file.path)}
      className={`w-full flex items-center gap-2 py-1.5 pr-3 text-left transition-colors ${
        active ? 'bg-[var(--primary)]/15 text-[var(--accent-cyan)]' : 'text-gray-300 hover:bg-[var(--surface-elevated)] hover:text-white'
      }`}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
    >
      <span>{file.icon}</span>
      <span className="font-mono truncate">{file.name}</span>
    </button>
  );
}
