"use client";

import { useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { NISKBUILD_MONACO_THEME, languageForPath, niskBuildMonacoTheme } from '@/lib/monaco-theme';

interface CodeEditorProps {
  path: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ path, value, onChange, readOnly = false }: CodeEditorProps) {
  const themeDefined = useRef(false);

  const handleMount: OnMount = (editor, monaco) => {
    if (!themeDefined.current) {
      monaco.editor.defineTheme(NISKBUILD_MONACO_THEME, niskBuildMonacoTheme);
      themeDefined.current = true;
    }
    monaco.editor.setTheme(NISKBUILD_MONACO_THEME);
    editor.focus();
  };

  return (
    <Editor
      key={path}
      height="100%"
      language={languageForPath(path)}
      value={value}
      theme={NISKBUILD_MONACO_THEME}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      loading={
        <div className="h-full flex items-center justify-center text-nisk-muted text-sm">
          Loading editor...
        </div>
      }
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        fontFamily: 'var(--font-geist-mono), Menlo, Monaco, Consolas, monospace',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: 'line',
        bracketPairColorization: { enabled: true },
        tabSize: 2,
        insertSpaces: true,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
      }}
    />
  );
}
