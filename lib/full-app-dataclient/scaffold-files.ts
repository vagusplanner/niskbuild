/**
 * Platform-owned DataClient scaffold injected into every Full App project.
 * Generated UI must call dataClient only — never @supabase/supabase-js directly.
 */

export const DATACLIENT_PATH = 'src/lib/dataClient.js';
export const SUPABASE_ADAPTER_PATH = 'src/lib/adapters/supabase.js';
export const ENV_EXAMPLE_PATH = '.env.example';
export const SCHEMA_SQL_PATH = 'supabase/schema.sql';

/** Adapter — only file allowed to import @supabase/supabase-js. */
export const SUPABASE_ADAPTER_SOURCE = `/**
 * Supabase adapter for NiskBuild DataClient.
 * Do not import this from UI components — use ../dataClient.js instead.
 */
import { createClient } from '@supabase/supabase-js';

function readBackendConfig(explicit = {}) {
  const w =
    typeof globalThis !== 'undefined' && globalThis.__NISK_BACKEND__
      ? globalThis.__NISK_BACKEND__
      : {};
  const meta =
    typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  return {
    url: String(
      explicit.url ||
        w.supabaseUrl ||
        meta.VITE_SUPABASE_URL ||
        ''
    ).trim(),
    anonKey: String(
      explicit.anonKey ||
        w.supabaseAnonKey ||
        meta.VITE_SUPABASE_ANON_KEY ||
        ''
    ).trim(),
  };
}

function notConfigured(op) {
  return {
    data: null,
    error: {
      message: \`DataClient is not configured (missing Supabase URL or anon key). Connect your backend in Project settings, or set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Failed: \${op}\`,
      code: 'NISK_NOT_CONFIGURED',
    },
  };
}

/** In-process lock — Web Locks API is blocked in sandboxed preview iframes. */
const processLockQueues = Object.create(null);
function processLock(name, _acquireTimeout, fn) {
  const prev = processLockQueues[name] || Promise.resolve();
  const next = prev.catch(function () {}).then(function () {
    return fn();
  });
  processLockQueues[name] = next.then(
    function () {},
    function () {}
  );
  return next;
}

function useProcessLock() {
  return (
    typeof globalThis !== 'undefined' && globalThis.__NISK_PREVIEW__ === true
  );
}

/**
 * Thenable query chain mirroring PostgREST / supabase-js:
 *   await dataClient.from('t').insert(row).select()
 *   await dataClient.from('t').update(row).eq('id', id).select()
 *   await dataClient.from('t').delete().eq('id', id)
 */
function makeChain(getBuilder, notConfiguredOp) {
  if (!getBuilder) {
    const rejected = Promise.resolve(notConfigured(notConfiguredOp));
    const stub = {
      select() {
        return stub;
      },
      eq() {
        return stub;
      },
      order() {
        return stub;
      },
      limit() {
        return stub;
      },
      then(onFulfilled, onRejected) {
        return rejected.then(onFulfilled, onRejected);
      },
    };
    return stub;
  }
  let q = getBuilder();
  const chain = {
    select(columns) {
      q = q.select(columns === undefined ? '*' : columns);
      return chain;
    },
    eq(column, value) {
      q = q.eq(column, value);
      return chain;
    },
    order(column, opts) {
      q = q.order(column, opts);
      return chain;
    },
    limit(n) {
      q = q.limit(n);
      return chain;
    },
    then(onFulfilled, onRejected) {
      return q.then(onFulfilled, onRejected);
    },
  };
  return chain;
}

/**
 * @param {{ url?: string, anonKey?: string }} [options]
 */
export function createSupabaseDataClient(options = {}) {
  const { url, anonKey } = readBackendConfig(options);
  const configured = Boolean(url && anonKey);
  const supabase = configured
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Preview iframe: navigator.locks.request throws
          // "LockManager.request: request() is not allowed in this context".
          ...(useProcessLock() ? { lock: processLock } : {}),
        },
      })
    : null;

  const auth = {
    async signUp({ email, password }) {
      if (!supabase) return notConfigured('auth.signUp');
      return supabase.auth.signUp({ email, password });
    },
    async signIn({ email, password }) {
      if (!supabase) return notConfigured('auth.signIn');
      return supabase.auth.signInWithPassword({ email, password });
    },
    async signOut() {
      if (!supabase) return notConfigured('auth.signOut');
      return supabase.auth.signOut();
    },
    async getSession() {
      if (!supabase) return notConfigured('auth.getSession');
      return supabase.auth.getSession();
    },
    async getUser() {
      if (!supabase) return notConfigured('auth.getUser');
      return supabase.auth.getUser();
    },
    onAuthStateChange(callback) {
      if (!supabase) {
        callback('NOT_CONFIGURED', null);
        return { data: { subscription: { unsubscribe() {} } } };
      }
      return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
    },
  };

  function from(table) {
    return {
      select(columns = '*') {
        return makeChain(
          supabase ? () => supabase.from(table).select(columns) : null,
          \`from('\${table}').select\`
        );
      },
      insert(values) {
        return makeChain(
          supabase ? () => supabase.from(table).insert(values) : null,
          \`from('\${table}').insert\`
        );
      },
      update(values) {
        return makeChain(
          supabase ? () => supabase.from(table).update(values) : null,
          \`from('\${table}').update\`
        );
      },
      delete() {
        return makeChain(
          supabase ? () => supabase.from(table).delete() : null,
          \`from('\${table}').delete\`
        );
      },
    };
  }

  return {
    isConfigured: configured,
    auth,
    from,
  };
}
`;

/** Public entry — components import this only. */
export const DATACLIENT_SOURCE = `/**
 * NiskBuild DataClient — stable interface for auth + database.
 * Implementation: Supabase adapter (swap adapters later without rewriting UI).
 */
import { createSupabaseDataClient } from './adapters/supabase.js';

export const dataClient = createSupabaseDataClient();

export function isDataClientConfigured() {
  return Boolean(dataClient?.isConfigured);
}
`;

export const ENV_EXAMPLE_SOURCE = `# Supabase (Connect your own backend in NiskBuild, or fill these for local Vite)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
`;

/**
 * Pattern A reference schema — auth-gated list/detail (habits/todos style).
 * AI should emit a subject-specific schema.sql; this is the fallback template.
 */
export const PATTERN_A_SCHEMA_SQL = `-- Pattern A: auth-gated owned rows (list/detail)
-- Apply in Supabase SQL Editor (or CLI) after connecting your project.

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_user_id_idx on public.items (user_id);

alter table public.items enable row level security;

create policy "items_select_own"
  on public.items for select
  using (auth.uid() = user_id);

create policy "items_insert_own"
  on public.items for insert
  with check (auth.uid() = user_id);

create policy "items_update_own"
  on public.items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "items_delete_own"
  on public.items for delete
  using (auth.uid() = user_id);
`;

export function getDataClientScaffoldFiles(): Record<string, string> {
  return {
    [DATACLIENT_PATH]: DATACLIENT_SOURCE,
    [SUPABASE_ADAPTER_PATH]: SUPABASE_ADAPTER_SOURCE,
    [ENV_EXAMPLE_PATH]: ENV_EXAMPLE_SOURCE,
  };
}
