import type { editor } from 'monaco-editor';

export const NISKBUILD_MONACO_THEME = 'niskbuild-light';

export const niskBuildMonacoTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '4A5568', fontStyle: 'italic' },
    { token: 'keyword', foreground: '064E3B' },
    { token: 'string', foreground: '046A38' },
    { token: 'number', foreground: '0369A1' },
    { token: 'tag', foreground: '0F172A' },
    { token: 'attribute.name', foreground: '0284C7' },
    { token: 'attribute.value', foreground: '059669' },
    { token: 'delimiter.html', foreground: '38BDF8' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#0F172A',
    'editor.lineHighlightBackground': '#E8EEF4',
    'editor.selectionBackground': '#BAE6FD88',
    'editor.inactiveSelectionBackground': '#BAE6FD44',
    'editorCursor.foreground': '#0284C7',
    'editorLineNumber.foreground': '#4A5568',
    'editorLineNumber.activeForeground': '#046A38',
    'editorIndentGuide.background': '#BCCCDC',
    'editorIndentGuide.activeBackground': '#4A5568',
    'editorWidget.background': '#FFFFFF',
    'editorWidget.border': '#BCCCDC',
    'scrollbarSlider.background': '#BCCCDC88',
    'scrollbarSlider.hoverBackground': '#4A5568aa',
  },
};

export function languageForPath(path: string): string {
  if (path.endsWith('.html') || path.endsWith('.htm')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'typescript';
  if (path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  return 'plaintext';
}
