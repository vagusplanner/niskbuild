/**
 * Minimal React app used by the Full App preview spike.
 * Mirrors the generated Full App shape (src/main.jsx + src/App.jsx).
 */

export const SPIKE_HELLO_WORLD_FILES: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'full-app-preview-spike',
      private: true,
      dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
    },
    null,
    2
  ),
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Spike</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`,
  'src/main.jsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
  'src/App.jsx': `export default function App() {
  return (
    <main className="spike">
      <p className="eyebrow">NiskBuild · Full App preview spike</p>
      <h1>Hello from esbuild-wasm</h1>
      <p className="body">
        This React app was bundled in the browser and rendered live — not a srcDoc placeholder.
      </p>
      <button type="button" onClick={() => alert('React event handlers work')}>
        Click me
      </button>
    </main>
  );
}
`,
  'src/styles.css': `body {
  margin: 0;
  background: #0f1419;
  color: #e8eef4;
}
.spike {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem;
  gap: 0.75rem;
  box-sizing: border-box;
}
.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7dd3c0;
}
h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 650;
}
.body {
  margin: 0;
  max-width: 36rem;
  line-height: 1.5;
  color: #a8b4c0;
}
button {
  align-self: flex-start;
  margin-top: 0.5rem;
  padding: 0.55rem 1rem;
  border: 0;
  border-radius: 8px;
  background: #7dd3c0;
  color: #0f1419;
  font-weight: 600;
  cursor: pointer;
}
button:hover { filter: brightness(1.05); }
`,
};
