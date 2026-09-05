import { createClient } from '@supabase/supabase-js'

// Prefer NEXT_PUBLIC_* so the SPA shares the same Supabase project as the Next API
// (root .env.local may also define VITE_* for a different app/project).
const supabaseUrl =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey =
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase URL / anon key (NEXT_PUBLIC_ or VITE_)')
}

export const supabase = createClient(supabaseUrl || 'http://invalid.local', supabaseAnonKey || 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
