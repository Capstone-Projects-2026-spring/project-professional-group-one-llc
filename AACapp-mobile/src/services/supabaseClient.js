import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let asyncStorage = null;
if (isSupabaseConfigured) {
  try {
    asyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (error) {
    console.warn(
      '[Supabase] AsyncStorage unavailable. Session persistence is disabled.',
    );
  }
}

const authConfig = asyncStorage
  ? {
      storage: asyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  : {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    };

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: authConfig })
  : null;