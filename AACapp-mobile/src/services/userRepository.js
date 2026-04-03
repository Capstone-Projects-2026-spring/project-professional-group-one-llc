import { supabase } from './supabaseClient';

export async function getCurrentUser() {
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export async function getUserProfile(userId) {
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertUserProfile({ id, displayName }) {
  if (!supabase || !id) {
    return null;
  }

  const payload = {
    id,
    display_name: displayName ?? null,
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload)
    .select('id, display_name, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
