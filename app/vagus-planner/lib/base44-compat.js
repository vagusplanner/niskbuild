// =============================================
// Base44 Compatibility Layer
// Replaces @base44/sdk with Supabase calls
// =============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

const COLUMN_ALIASES = {
  updated_date: 'updated_at',
  created_date: 'created_at',
  completion_date: 'completed_at',
  start_date: 'due_date',
  date: 'event_date',
};

const ENTITY_TABLES = {
  Task: { schema: 'firstparty', table: 'vp_tasks' },
  Event: { schema: 'firstparty', table: 'vp_events' },
  UserSettings: { schema: 'firstparty', table: 'vp_user_settings' },
  Category: { schema: 'firstparty', table: 'vp_categories' },
  Holiday: { schema: 'firstparty', table: 'vp_holidays' },
  Reflection: { schema: 'firstparty', table: 'vp_reflections' },
  Expense: { schema: 'firstparty', table: 'vp_expenses' },
  Goal: { schema: 'firstparty', table: 'vp_goals' },
  PrayerLog: { schema: 'firstparty', table: 'vp_prayer_logs' },
  NotificationPreference: { schema: 'firstparty', table: 'vp_notification_preferences' },
  Notification: { schema: 'firstparty', table: 'vp_notifications' },
  Chat: { schema: 'firstparty', table: 'vp_chats' },
};

function mapColumn(column) {
  return COLUMN_ALIASES[column] ?? column;
}

function tableClient(schema, table) {
  return schema ? supabase.schema(schema).from(table) : supabase.from(table);
}

function resolveEntity(entityName) {
  const mapped = ENTITY_TABLES[entityName];
  if (mapped) return mapped;
  return { schema: null, table: entityName };
}

function applySort(query, sortField) {
  if (!sortField) return query;
  const desc = sortField.startsWith('-');
  const column = mapColumn(desc ? sortField.slice(1) : sortField);
  return query.order(column, { ascending: !desc, nullsFirst: false });
}

function applyFilters(query, criteria = {}) {
  let next = query;
  for (const [key, value] of Object.entries(criteria)) {
    const column = mapColumn(key);
    if (value && typeof value === 'object' && '$gte' in value) {
      next = next.gte(column, value.$gte);
    } else if (value && typeof value === 'object' && '$lte' in value) {
      next = next.lte(column, value.$lte);
    } else {
      next = next.eq(column, value);
    }
  }
  return next;
}

function createEntityApi(entityName) {
  const { schema, table } = resolveEntity(entityName);

  return {
    list: async (sortField, limit) => {
      console.log(`🔍 Listing entity: ${entityName}`);
      let query = tableClient(schema, table).select('*');
      if (typeof sortField === 'string') {
        query = applySort(query, sortField);
      } else if (sortField && typeof sortField === 'object') {
        query = applyFilters(query, sortField);
      }
      if (typeof limit === 'number') query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },

    filter: async (criteria = {}, sortField, limit) => {
      console.log(`🔍 Filtering entity: ${entityName}`, criteria);
      let query = tableClient(schema, table).select('*');
      query = applyFilters(query, criteria);
      query = applySort(query, sortField);
      if (typeof limit === 'number') query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },

    get: async (id) => {
      const { data, error } = await tableClient(schema, table)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    create: async (payload) => {
      const { data, error } = await tableClient(schema, table)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    update: async (id, payload) => {
      const { data, error } = await tableClient(schema, table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await tableClient(schema, table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    // Realtime not wired in compat layer yet — no-op for legacy subscribers
    subscribe: () => () => {},
  };
}

export const base44 = {
  db: {
    from: (table) => {
      console.log(`🔍 Querying table: ${table}`);
      return supabase.from(table);
    },
    auth: {
      getUser: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        return user;
      },
      getSession: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        return session;
      },
    },
    storage: {
      from: (bucket) => supabase.storage.from(bucket),
    },
  },

  auth: {
    getCurrentUser: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },

    getUser: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },

    me: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const err = new Error('Not authenticated');
        err.status = 401;
        throw err;
      }
      return user;
    },

    isAuthenticated: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return !!session?.user;
    },

    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    signUp: async (email, password, metadata) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (error) throw error;
      return data;
    },

    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    },

    logout: async (redirectUrl) => {
      await supabase.auth.signOut();
      if (redirectUrl && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },

    redirectToLogin: (nextPath = '/vagus-planner/dashboard') => {
      if (typeof window !== 'undefined') {
        window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
      }
    },

    onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),

    updateMe: async (data) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: row, error } = await supabase
        .schema('firstparty')
        .from('vp_user_settings')
        .upsert({
          user_id: user.id,
          preferences: data,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return row;
    },
  },

  entities: new Proxy(
    {},
    {
      get: (_target, entityName) => {
        if (typeof entityName !== 'string') return undefined;
        return createEntityApi(entityName);
      },
    }
  ),

  functions: {
    invoke: async (name, payload = {}) => {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ functionName: name, ...payload }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Function "${name}" failed`);
      }
      return response.json();
    },
  },

  integrations: {
    Core: {
      InvokeLLM: async (params) => {
        const response = await fetch('/api/ai-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ mode: 'llm', ...params }),
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'LLM invocation failed');
        }
        return response.json();
      },
    },
  },

  agents: {
    getWhatsAppConnectURL: () => '#whatsapp-not-configured',
  },
};

export const SDK = base44;

export const createAxiosClient = (config = {}) => {
  const baseURL = config.baseURL ?? '';

  const request = async (method, url, data) => {
    console.log(`📡 ${method.toUpperCase()} ${baseURL}${url}`, data ?? '');

    if (url.includes('public-settings')) {
      return { id: 'vagus-planner', public_settings: {} };
    }

    return { data: {} };
  };

  return {
    get: async (url) => request('get', url),
    post: async (url, data) => request('post', url, data),
    put: async (url, data) => request('put', url, data),
    delete: async (url) => request('delete', url),
  };
};

export default base44;
