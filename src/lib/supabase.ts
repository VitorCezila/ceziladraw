import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Returns true when Supabase env vars are configured.
 * When false the app runs in local-only mode (no auth, no cloud save).
 */
export const SUPABASE_ENABLED = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = SUPABASE_ENABLED
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
