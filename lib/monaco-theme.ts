import type { editor } from 'monaco-editor';

export const NISKBUILD_MONACO_THEME = 'niskbuild-dark';

export const niskBuildMonacoTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '546E7A', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'C792EA' },
    { token: 'string', foreground: 'C3E88D' },
    { token: 'number', foreground: 'F78C6C' },
    { token: 'tag', foreground: 'F07178' },
    { token: 'attribute.name', foreground: 'FFCB6B' },
    { token: 'attribute.value', foreground: 'C3E88D' },
    { token: 'delimiter.html', foreground: '82AAFF' },
  ],
  colors: {
    'editor.background': '#0A0E17',
    'editor.foreground': '#ABB2BF',
    'editor.lineHighlightBackground': '#111827',
    'editor.selectionBackground': '#4F6EF755',
    'editor.inactiveSelectionBackground': '#4F6EF733',
    'editorCursor.foreground': '#22D3EE',
    'editorLineNumber.foreground': '#4B5563',
    'editorLineNumber.activeForeground': '#22D3EE',
    'editorIndentGuide.background': '#1F2937',
    'editorIndentGuide.activeBackground': '#374151',
    'editorWidget.background': '#111827',
    'editorWidget.border': '#1F2937',
    'scrollbarSlider.background': '#33415588',
    'scrollbarSlider.hoverBackground': '#475569aa',
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
