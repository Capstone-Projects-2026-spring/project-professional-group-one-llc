import { supabase } from './supabaseClient';

/**
 * createInteractionLog
 * --------------------
 * Persists a new interaction event to the Supabase 'interaction_logs' table.
 * Mapping camelCase arguments to snake_case DB columns.
 */
export async function createInteractionLog({
  userId = null,
  deviceId,
  buttonName,
  pressedAt,
  roomId,
  roomLabel,
  metadata = {},
}) {
  if (!supabase) {
    return null;
  }

  const payload = {
    user_id: userId,
    device_id: deviceId,
    button_name: buttonName,
    pressed_at: pressedAt,
    room_id: roomId,
    room_label: roomLabel,
    metadata,
  };

  const { error } = await supabase.from('interaction_logs').insert(payload);

  if (error) {
    throw error;
  }

  return true;
}

/**
 * fetchInteractionLogs
 * --------------------
 * Retrieves the most recent interaction logs.
 * Useful for debugging or displaying in-app audit trails.
 */
export async function fetchInteractionLogs(limit = 50) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('interaction_logs')
    .select('*')
    .order('pressed_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
}
