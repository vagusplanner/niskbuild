export interface ProjectFile {
  path: string;
  name: string;
  content: string;
  icon: string;
}

const DEFAULT_FILES: ProjectFile[] = [
  { path: 'index.html', name: 'index.html', content: '', icon: '📄' },
  { path: 'styles.css', name: 'styles.css', content: '/* Styles */\n', icon: '🎨' },
  { path: 'script.js', name: 'script.js', content: '// Logic\n', icon: '⚡' },
];

export function buildProjectFiles(code: string, fileMap?: Record<string, string>): ProjectFile[] {
  if (fileMap && Object.keys(fileMap).length > 0) {
    return Object.entries(fileMap).map(([path, content]) => ({
      path,
      name: path.split('/').pop() || path,
      content,
      icon: path.endsWith('.css') ? '🎨' : path.endsWith('.js') ? '⚡' : path.endsWith('.tsx') ? '⚛️' : '📄',
    }));
  }

  if (!code) return DEFAULT_FILES;

  return [
    { ...DEFAULT_FILES[0], content: code },
    DEFAULT_FILES[1],
    DEFAULT_FILES[2],
  ];
}

export function filesToMap(files: ProjectFile[]): Record<string, string> {
  return Object.fromEntries(files.map((f) => [f.path, f.content]));
}
