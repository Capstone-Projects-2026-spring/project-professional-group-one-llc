import { supabase } from './supabaseClient';

export async function insertInteractionLog({
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
