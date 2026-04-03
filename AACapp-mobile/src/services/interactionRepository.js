import { supabase } from "./supabaseClient";

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
    throw new Error(
      "Supabase client not initialized. Check your environment variables.",
    );
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

  const { error } = await supabase.from("interaction_logs").insert(payload);

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
    .from("interaction_logs")
    .select("*")
    .order("pressed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
}

/**
 * normalizeInteractionAnalytics
 * -----------------------------
 * Ensures the admin analytics payload always has the same app-facing shape.
 */
export function normalizeInteractionAnalytics(payload) {
  const totals = payload?.totals ?? {};

  return {
    windowHours: payload?.windowHours ?? 168,
    generatedAt: payload?.generatedAt ?? null,
    totals: {
      interactions: totals.interactions ?? 0,
      devices: totals.devices ?? 0,
      rooms: totals.rooms ?? 0,
      buttons: totals.buttons ?? 0,
    },
    topButtons: Array.isArray(payload?.topButtons) ? payload.topButtons : [],
    topRooms: Array.isArray(payload?.topRooms) ? payload.topRooms : [],
    recentLogs: Array.isArray(payload?.recentLogs) ? payload.recentLogs : [],
  };
}

/**
 * fetchInteractionAnalytics
 * -------------------------
 * Retrieves summarized interaction analytics for admins who provide
 * a valid access code. The validation happens inside Supabase.
 */
export async function fetchInteractionAnalytics({
  adminAccessCode,
  windowHours = 168,
  recentLimit = 25,
}) {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized. Check your environment variables.',
    );
  }

  const { data, error } = await supabase.rpc('get_interaction_analytics', {
    admin_access_code: adminAccessCode,
    hours_window: windowHours,
    recent_limit: recentLimit,
  });

  if (error) {
    throw error;
  }

  return normalizeInteractionAnalytics(data);
}
