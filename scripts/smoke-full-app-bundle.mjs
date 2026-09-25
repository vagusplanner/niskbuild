/**
 * Smoke test for Full App bundle parse + completeness (no network).
 * Run: node --experimental-strip-types scripts/smoke-full-app-bundle.mjs
 * Or via tsx if available.
 */
import {
  assessFullAppCompleteness,
  parseFullAppBundle,
  fullAppFilesToProjectFiles,
  isFullAppProjectFiles,
  fullAppPrimaryCode,
} from '../lib/full-app-bundle.ts';

const sample = `
@@@FILE package.json
{
  "name": "task-board",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
@@@ENDFILE
@@@FILE vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
@@@ENDFILE
@@@FILE index.html
<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Task Board</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
@@@ENDFILE
@@@FILE src/main.jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'
createRoot(document.getElementById('root')).render(
  <BrowserRouter><App /></BrowserRouter>
)
@@@ENDFILE
@@@FILE src/App.jsx
import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Home from './pages/Home.jsx'
import Board from './pages/Board.jsx'
import { TaskProvider } from './state/TaskContext.jsx'
export default function App() {
  return (
    <TaskProvider>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/board" element={<Board />} />
      </Routes>
    </TaskProvider>
  )
}
@@@ENDFILE
@@@FILE src/styles.css
:root { --bg: #0f1419; --ink: #e8dcc8; }
body { margin: 0; font-family: system-ui; background: var(--bg); color: var(--ink); }
@@@ENDFILE
@@@FILE src/components/Nav.jsx
import { NavLink } from 'react-router-dom'
export default function Nav() {
  return (
    <nav>
      <NavLink to="/">Home</NavLink>
      <NavLink to="/board">Board</NavLink>
    </nav>
  )
}
@@@ENDFILE
@@@FILE src/pages/Home.jsx
export default function Home() {
  return <main><h1>Task Board</h1><p>Plan work across your team.</p></main>
}
@@@ENDFILE
@@@FILE src/pages/Board.jsx
import { useTasks } from '../state/TaskContext.jsx'
export default function Board() {
  const { tasks } = useTasks()
  return <main><h1>Board</h1><ul>{tasks.map(t => <li key={t.id}>{t.title}</li>)}</ul></main>
}
@@@ENDFILE
@@@FILE src/state/TaskContext.jsx
import { createContext, useContext, useState } from 'react'
const Ctx = createContext(null)
export function TaskProvider({ children }) {
  const [tasks] = useState([{ id: '1', title: 'Ship Full App mode' }])
  return <Ctx.Provider value={{ tasks }}>{children}</Ctx.Provider>
}
export function useTasks() { return useContext(Ctx) }
@@@ENDFILE
@@@DONE
`;

const parsed = parseFullAppBundle(sample);
console.log('fileCount', parsed.fileCount, 'done', parsed.done);
console.log('paths', Object.keys(parsed.files).sort().join(', '));
const completeness = assessFullAppCompleteness(sample, 'end_turn');
console.log('complete', completeness);
const files = fullAppFilesToProjectFiles(parsed.files);
console.log('isFullAppProject', isFullAppProjectFiles(files));
console.log('primary starts with', fullAppPrimaryCode(parsed.files).slice(0, 30));
if (!completeness.complete || parsed.fileCount < 8) {
  console.error('SMOKE FAIL');
  process.exit(1);
}
console.log('SMOKE OK');
