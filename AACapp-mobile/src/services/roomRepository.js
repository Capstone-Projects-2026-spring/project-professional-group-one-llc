import { supabase } from './supabaseClient';

function mapLabel(link) {
  const wordLabel = Array.isArray(link.word_labels)
    ? link.word_labels[0]
    : link.word_labels;

  if (!wordLabel?.label) {
    return null;
  }

  return {
    label: wordLabel.label,
    ...(wordLabel.arasaac_id ? { arasaacId: String(wordLabel.arasaac_id) } : {}),
  };
}

function mapRoomRow(row) {
  const orderedLinks = [...(row.room_word_labels ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );

  return {
    id: row.id,
    label: row.label,
    emoji: row.emoji ?? '📍',
    color: row.color ?? '#6C63FF',
    beaconId: row.beacon_id ?? null,
    suggestions: orderedLinks.map(mapLabel).filter(Boolean),
  };
}

export async function fetchRoomsWithSuggestions() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('rooms').select(`
      id,
      label,
      emoji,
      color,
      beacon_id,
      room_word_labels (
        position,
        word_labels (
          label,
          arasaac_id
        )
      )
    `);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRoomRow).sort((a, b) => a.label.localeCompare(b.label));
}
