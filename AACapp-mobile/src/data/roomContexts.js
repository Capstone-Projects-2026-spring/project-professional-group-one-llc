/**
 * Room-specific AAC word/phrase suggestions.
 *
 * Each key is a room identifier that will eventually map to a
 * Bluetooth beacon UUID.  The `beaconId` field is a placeholder
 * for the real UUID that will be programmed into the physical beacon.
 *
 * When Bluetooth is wired up, the app will detect a beacon,
 * look up the matching room by `beaconId`, and load its suggestions.
 */

const ROOM_CONTEXTS = {
  kitchen: {
    id: 'kitchen',
    label: 'Kitchen',
    emoji: '🍳',
    color: '#FF9F43',
    beaconId: 'beacon-kitchen-001', // placeholder – replace with real UUID
    suggestions: [
      { label: 'Hungry', emoji: '🤤' },
      { label: 'Thirsty', emoji: '💧' },
      { label: 'Eat', emoji: '🍽️' },
      { label: 'Drink', emoji: '🥤' },
      { label: 'Water', emoji: '💦' },
      { label: 'Snack', emoji: '🍪' },
      { label: 'Cook', emoji: '👨‍🍳' },
      { label: 'Hot', emoji: '🔥' },
      { label: 'Cold', emoji: '🧊' },
      { label: 'More', emoji: '➕' },
      { label: 'All done', emoji: '✔️' },
      { label: 'Help', emoji: '🆘' },
    ],
  },

  bathroom: {
    id: 'bathroom',
    label: 'Bathroom',
    emoji: '🚿',
    color: '#54A0FF',
    beaconId: 'beacon-bathroom-001',
    suggestions: [
      { label: 'Toilet', emoji: '🚽' },
      { label: 'Wash hands', emoji: '🧼' },
      { label: 'Brush teeth', emoji: '🪥' },
      { label: 'Shower', emoji: '🚿' },
      { label: 'Towel', emoji: '🛁' },
      { label: 'Help', emoji: '🆘' },
      { label: 'All done', emoji: '✔️' },
      { label: 'Wait', emoji: '✋' },
      { label: 'Privacy', emoji: '🚪' },
    ],
  },

  bedroom: {
    id: 'bedroom',
    label: 'Bedroom',
    emoji: '🛏️',
    color: '#5F27CD',
    beaconId: 'beacon-bedroom-001',
    suggestions: [
      { label: 'Tired', emoji: '😩' },
      { label: 'Sleep', emoji: '😴' },
      { label: 'Wake up', emoji: '⏰' },
      { label: 'Blanket', emoji: '🛏️' },
      { label: 'Light on', emoji: '💡' },
      { label: 'Light off', emoji: '🌙' },
      { label: 'Read', emoji: '📖' },
      { label: 'Music', emoji: '🎵' },
      { label: 'Quiet', emoji: '🤫' },
      { label: 'Help', emoji: '🆘' },
      { label: 'Scared', emoji: '😨' },
      { label: 'Hug', emoji: '🤗' },
    ],
  },

  livingRoom: {
    id: 'livingRoom',
    label: 'Living Room',
    emoji: '🛋️',
    color: '#10AC84',
    beaconId: 'beacon-livingroom-001',
    suggestions: [
      { label: 'Watch TV', emoji: '📺' },
      { label: 'Play', emoji: '🎮' },
      { label: 'Music', emoji: '🎵' },
      { label: 'Sit', emoji: '🪑' },
      { label: 'Relax', emoji: '😌' },
      { label: 'Talk', emoji: '💬' },
      { label: 'Snack', emoji: '🍿' },
      { label: 'Read', emoji: '📖' },
      { label: 'Loud', emoji: '🔊' },
      { label: 'Quiet', emoji: '🤫' },
      { label: 'Together', emoji: '👨‍👩‍👧‍👦' },
      { label: 'Help', emoji: '🆘' },
    ],
  },

  classroom: {
    id: 'classroom',
    label: 'Classroom',
    emoji: '🏫',
    color: '#EE5A24',
    beaconId: 'DD:88:00:00:14:22',
    suggestions: [
      { label: 'Teacher', emoji: '👩‍🏫' },
      { label: 'Question', emoji: '❓' },
      { label: 'Help', emoji: '🆘' },
      { label: 'Yes', emoji: '✅' },
      { label: 'No', emoji: '❌' },
      { label: 'Read', emoji: '📖' },
      { label: 'Write', emoji: '✍️' },
      { label: 'Listen', emoji: '👂' },
      { label: 'Break', emoji: '⏸️' },
      { label: 'Bathroom', emoji: '🚻' },
      { label: 'Done', emoji: '✔️' },
      { label: 'More time', emoji: '⏳' },
    ],
  },

  outside: {
    id: 'outside',
    label: 'Outside',
    emoji: '🌳',
    color: '#2ECC71',
    beaconId: '426C7565-4368-6172-6D42-6561636F6E73',
    suggestions: [
      { label: 'Walk', emoji: '🚶' },
      { label: 'Run', emoji: '🏃' },
      { label: 'Play', emoji: '⚽' },
      { label: 'Swing', emoji: '🎠' },
      { label: 'Hot', emoji: '☀️' },
      { label: 'Cold', emoji: '🥶' },
      { label: 'Water', emoji: '💦' },
      { label: 'Go home', emoji: '🏠' },
      { label: 'Stop', emoji: '🛑' },
      { label: 'Look', emoji: '👀' },
      { label: 'Fun', emoji: '🎉' },
      { label: 'Help', emoji: '🆘' },
    ],
  },
};

/**
 * Look up a room context by its beacon UUID.
 * This is the function Bluetooth detection will call.
 */
export function getRoomByBeaconId(beaconId) {
  return (
    Object.values(ROOM_CONTEXTS).find((r) => r.beaconId === beaconId) || null
  );
}

/**
 * Return every available room (used by the manual room picker).
 */
export function getAllRooms() {
  return Object.values(ROOM_CONTEXTS);
}

export default ROOM_CONTEXTS;
