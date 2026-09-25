/**
 * Pattern A fixture: auth-gated habits list/detail via DataClient (not localStorage).
 * Used for preview + smoke evidence of Full App backend integration.
 */
import type { ProjectFile } from '@/lib/project-files';
import { iconForProjectPath } from '@/lib/full-app-bundle';
import { injectDataClientScaffold } from '@/lib/full-app-dataclient/inject';

const RAW: Record<string, string> = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ember Habits</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
  'package.json': `{
  "name": "ember-habits",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.1",
    "@supabase/supabase-js": "^2.49.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}`,
  'vite.config.js': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`,
  'src/main.jsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);`,
  'src/App.jsx': `import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Home from './pages/Home.jsx';
import Habits from './pages/Habits.jsx';
import HabitDetail from './pages/HabitDetail.jsx';
import Auth from './pages/Auth.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { isDataClientConfigured } from './lib/dataClient.js';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="pad">Loading…</p>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app">
      <Nav />
      <main className="content">
        {!isDataClientConfigured() ? (
          <section className="banner">
            <h1>Connect your backend</h1>
            <p>
              Open Project settings → Backend and paste your Supabase URL + anon key,
              then run <code>supabase/schema.sql</code> in the SQL Editor.
            </p>
          </section>
        ) : null}
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Home />} />
          <Route
            path="/habits"
            element={
              <RequireAuth>
                <Habits />
              </RequireAuth>
            }
          />
          <Route
            path="/habits/:id"
            element={
              <RequireAuth>
                <HabitDetail />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  );
}`,
  'src/context/AuthContext.jsx': `import React, { createContext, useContext, useEffect, useState } from 'react';
import { dataClient } from '../lib/dataClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    dataClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = dataClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = {
    user,
    loading,
    async signUp(email, password) {
      return dataClient.auth.signUp({ email, password });
    },
    async signIn(email, password) {
      return dataClient.auth.signIn({ email, password });
    },
    async signOut() {
      return dataClient.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}`,
  'src/components/Nav.jsx': `import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Nav() {
  const { user, signOut } = useAuth();
  return (
    <nav>
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        Home
      </NavLink>
      <NavLink to="/habits" className={({ isActive }) => (isActive ? 'active' : '')}>
        Habits
      </NavLink>
      {user ? (
        <button type="button" className="linkish" onClick={() => void signOut()}>
          Sign out
        </button>
      ) : (
        <NavLink to="/auth" className={({ isActive }) => (isActive ? 'active' : '')}>
          Sign in
        </NavLink>
      )}
    </nav>
  );
}`,
  'src/pages/Auth.jsx': `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Auth() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate('/habits');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err.message || String(err));
      return;
    }
    navigate('/habits');
  }

  return (
    <section>
      <h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
      <p className="muted">Email + password — stored in your connected Supabase project.</p>
      <form onSubmit={onSubmit} className="stack">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="err">{error}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>
      <button
        type="button"
        className="linkish"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
      >
        {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </button>
    </section>
  );
}`,
  'src/pages/Home.jsx': `import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();
  return (
    <section>
      <h1>Ember Habits</h1>
      <p>Track daily habits with real persistence in your Supabase project.</p>
      {user ? (
        <p>
          Signed in as <strong>{user.email}</strong>.{' '}
          <Link to="/habits">Open habits →</Link>
        </p>
      ) : (
        <p>
          <Link to="/auth">Sign in</Link> to manage your list.
        </p>
      )}
    </section>
  );
}`,
  'src/pages/Habits.jsx': `import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dataClient } from '../lib/dataClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Habits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error: err } = await dataClient
      .from('habits')
      .select()
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setHabits(data || []);
    setError(null);
  }

  useEffect(() => {
    if (user?.id) void load();
  }, [user?.id]);

  async function onAdd(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const { error: err } = await dataClient.from('habits').insert({
      title: trimmed,
      user_id: user.id,
      completed: false,
    }).select();
    if (err) {
      setError(err.message);
      return;
    }
    setTitle('');
    await load();
  }

  return (
    <section>
      <h1>Your habits</h1>
      <form onSubmit={onAdd} className="row">
        <input
          type="text"
          placeholder="New habit"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>
      {error ? <p className="err">{error}</p> : null}
      {loading ? <p>Loading…</p> : null}
      <ul className="habit-list">
        {habits.map((h) => (
          <li key={h.id} className={h.completed ? 'completed' : ''}>
            <Link to={\`/habits/\${h.id}\`}>{h.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}`,
  'src/pages/HabitDetail.jsx': `import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { dataClient } from '../lib/dataClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function HabitDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [habit, setHabit] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await dataClient
        .from('habits')
        .select()
        .eq('id', id)
        .eq('user_id', user.id)
        .limit(1);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        return;
      }
      setHabit(data?.[0] ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  async function toggle() {
    if (!habit) return;
    const { data, error: err } = await dataClient
      .from('habits')
      .update({ completed: !habit.completed, updated_at: new Date().toISOString() })
      .eq('id', habit.id)
      .select();
    if (err) {
      setError(err.message);
      return;
    }
    setHabit(data?.[0] ?? { ...habit, completed: !habit.completed });
  }

  async function remove() {
    const { error: err } = await dataClient.from('habits').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    navigate('/habits');
  }

  if (!habit && !error) return <p className="pad">Loading…</p>;
  if (!habit) return <p className="err">{error || 'Not found'}</p>;

  return (
    <section>
      <p>
        <Link to="/habits">← Habits</Link>
      </p>
      <h1>{habit.title}</h1>
      <p>Status: {habit.completed ? 'Done' : 'Open'}</p>
      {error ? <p className="err">{error}</p> : null}
      <div className="row">
        <button type="button" onClick={() => void toggle()}>
          {habit.completed ? 'Mark open' : 'Mark done'}
        </button>
        <button type="button" className="danger" onClick={() => void remove()}>
          Delete
        </button>
      </div>
    </section>
  );
}`,
  'src/styles.css': `*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #2b1b0e;
  --accent: #ff6f3c;
  --soft: #ff9a56;
  --text: #f5e8df;
  --muted: #c4a996;
  --danger: #f87171;
}

html,
body,
#root {
  min-height: 100%;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.content {
  flex: 1;
  padding: 1rem;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}

nav {
  background: var(--accent);
  padding: 0.6rem 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}

nav a,
.linkish {
  color: var(--text);
  text-decoration: none;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
}

nav a.active {
  border-bottom: 2px solid #ffb86c;
}

.banner {
  border: 1px dashed var(--soft);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
}

.muted {
  color: var(--muted);
  margin: 0.5rem 0 1rem;
}

.stack,
.row {
  display: flex;
  gap: 0.5rem;
  margin: 0.75rem 0;
}

.stack {
  flex-direction: column;
}

input {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 6px;
  flex: 1;
}

button {
  font: inherit;
  padding: 0.5rem 0.9rem;
  border: none;
  border-radius: 6px;
  background: var(--soft);
  color: var(--bg);
  cursor: pointer;
  font-weight: 600;
}

button.danger {
  background: var(--danger);
  color: #1a0a0a;
}

.err {
  color: var(--danger);
  margin: 0.5rem 0;
}

.habit-list {
  list-style: none;
  margin-top: 1rem;
}

.habit-list li {
  background: rgba(255, 111, 60, 0.12);
  padding: 0.6rem 0.9rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
}

.habit-list li.completed a {
  text-decoration: line-through;
  opacity: 0.75;
}

.habit-list a {
  color: var(--text);
}

.pad {
  padding: 1rem;
}`,
  'supabase/schema.sql': `-- Pattern A: auth-gated habits
-- Grants required when "Automatically expose new tables" is OFF (recommended).
-- Postgres checks GRANTs before RLS — missing grants → "permission denied for table".

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_id_idx on public.habits (user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.habits to authenticated;
grant select, insert, update, delete on table public.habits to service_role;

alter table public.habits enable row level security;

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own"
  on public.habits for select
  using (auth.uid() = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own"
  on public.habits for insert
  with check (auth.uid() = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own"
  on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own"
  on public.habits for delete
  using (auth.uid() = user_id);
`,
};

export const PATTERN_A_HABITS_FILES: Record<string, string> =
  injectDataClientScaffold(RAW);

export const PATTERN_A_HABITS_PROJECT_FILES: ProjectFile[] = Object.entries(
  PATTERN_A_HABITS_FILES
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, content]) => ({
    path,
    name: path.split('/').pop() || path,
    content,
    icon: iconForProjectPath(path),
  }));
