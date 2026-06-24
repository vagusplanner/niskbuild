import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// BASE44 COMPATIBILITY LAYER
// All existing imports will work
// ============================================

export const base44 = {
  // ============================================
  // AUTH
  // ============================================
  auth: {
    getCurrentUser: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
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
    },
    onAuthStateChange: (callback) => {
      return supabase.auth.onAuthStateChange(callback);
    },
  },

  // ============================================
  // DATABASE (Supabase)
  // ============================================
  db: {
    from: (table) => ({
      select: (columns) => ({
        eq: (field, value) => ({
          single: async () => {
            const { data, error } = await supabase
              .from(table)
              .select(columns)
              .eq(field, value)
              .single();
            if (error) throw error;
            return data;
          },
          order: (field, options) => ({
            then: (callback) => {
              supabase.from(table).select(columns).eq(field, value).order(field, options).then(callback);
            },
          }),
        }),
        order: (field, options) => ({
          then: (callback) => {
            supabase.from(table).select(columns).order(field, options).then(callback);
          },
        }),
        then: (callback) => {
          supabase.from(table).select(columns).then(callback);
        },
      }),
      insert: (data) => ({
        select: () => ({
          single: async () => {
            const { data: result, error } = await supabase
              .from(table)
              .insert(data)
              .select()
              .single();
            if (error) throw error;
            return result;
          },
        }),
      }),
      update: (data) => ({
        eq: (field, value) => ({
          select: () => ({
            single: async () => {
              const { data: result, error } = await supabase
                .from(table)
                .update(data)
                .eq(field, value)
                .select()
                .single();
              if (error) throw error;
              return result;
            },
          }),
        }),
      }),
      delete: () => ({
        eq: (field, value) => ({
          then: (callback) => {
            supabase.from(table).delete().eq(field, value).then(callback);
          },
        }),
      }),
    }),
  },

  // ============================================
  // STORAGE
  // ============================================
  storage: {
    upload: async (bucket, path, file) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file);
      if (error) throw error;
      return data;
    },
    getUrl: (bucket, path) => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },
    list: async (bucket, path) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path);
      if (error) throw error;
      return data;
    },
    remove: async (bucket, paths) => {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(paths);
      if (error) throw error;
    },
  },

  // ============================================
  // API HELPERS (for your existing endpoints)
  // ============================================
  api: {
    get: async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    post: async (url, data) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    put: async (url, data) => {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    delete: async (url) => {
      const response = await fetch(url, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  },

  // ============================================
  // REALTIME
  // ============================================
  realtime: {
    subscribe: (channel, callback) => {
      const subscription = supabase
        .channel(channel)
        .on('postgres_changes', { event: '*', schema: 'public' }, callback)
        .subscribe();
      return subscription;
    },
  },

  // ============================================
  // UTILITIES
  // ============================================
  utils: {
    generateId: () => crypto.randomUUID(),
    formatDate: (date) => new Date(date).toISOString(),
    parseError: (error) => error.message || 'An error occurred',
  },
};

// ============================================
// DEFAULT EXPORT (for backward compatibility)
// ============================================
export default base44;
