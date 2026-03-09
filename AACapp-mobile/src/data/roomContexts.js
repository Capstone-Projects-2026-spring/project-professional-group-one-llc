/**
 * Room-specific AAC word/phrase suggestions.
 *
 * Each key is a room identifier that will eventually map to a
 * Bluetooth beacon UUID.  The `beaconId` field is a placeholder
 * for the real UUID that will be programmed into the physical beacon.
 *
 * When Bluetooth is wired up, the app will detect a beacon,
 * look up the matching room by `beaconId`, and load its suggestions.
 *
 * NOTE: `emoji` has been removed from suggestion objects.
 * Pictograms are now fetched automatically from the ARASAAC API
 * using each suggestion's `label` as the search keyword.
 * See: hooks/usePictogram.js
 *
 * Room-level `emoji` is kept because RoomSelector still uses it for chips.
 */

const ROOM_CONTEXTS = {
  kitchen: {
    id: 'kitchen',
    label: 'Kitchen',
    emoji: '🍳',
    color: '#FF9F43',
    beaconId: 'beacon-kitchen-001', // placeholder – replace with real UUID
    suggestions: [
      { label: 'Hungry' },
      { label: 'Thirsty' },
      { label: 'Eat', arasaacId: '6456' },
      { label: 'Drink', arasaacId: '6061' },
      { label: 'Water', arasaacId: '2248' },
      { label: 'Snack' },
      { label: 'Cook' },
      { label: 'Hot', arasaacId: '2300' },
      { label: 'Cold' },
      { label: 'More' },
      { label: 'All done' },
      { label: 'Help' },
    ],
  },

  bathroom: {
    id: 'bathroom',
    label: 'Bathroom',
    emoji: '🚿',
    color: '#54A0FF',
    beaconId: 'beacon-bathroom-001',
    suggestions: [
      { label: 'Toilet' },
      { label: 'Wash hands' },
      { label: 'Brush teeth' },
      { label: 'Shower' },
      { label: 'Towel' },
      { label: 'Help' },
      { label: 'All done' },
      { label: 'Wait' },
      { label: 'Privacy' },
    ],
  },

  bedroom: {
    id: 'bedroom',
    label: 'Bedroom',
    emoji: '🛏️',
    color: '#5F27CD',
    beaconId: 'beacon-bedroom-001',
    suggestions: [
      { label: 'Tired' },
      { label: 'Drink', arasaacId: '6061' },
      { label: 'Wake up' },
      { label: 'Blanket' },
      { label: 'Light on', arasaacId: '8103' },   // ⚠️ wrong pictogram? add: arasaacId: XXXXX
      { label: 'Light off', arasaacId: '8027' },  // ⚠️ wrong pictogram? add: arasaacId: XXXXX
      { label: 'Read' },
      { label: 'Music' },
      { label: 'Quiet' },
      { label: 'Help' },
      { label: 'Scared' },
      { label: 'Hug' },
    ],
  },

  livingRoom: {
    id: 'livingRoom',
    label: 'Living Room',
    emoji: '🛋️',
    color: '#10AC84',
    beaconId: 'beacon-livingroom-001',
    suggestions: [
      { label: 'Watch TV' },
      { label: 'Play' },
      { label: 'Music' },
      { label: 'Sit' },
      { label: 'Relax', arasaacId: '2571'}, 
      { label: 'Talk' },
      { label: 'Snack' },
      { label: 'Read' },
      { label: 'Loud' },
      { label: 'Quiet' },
      { label: 'Together' },
      { label: 'Help' },
    ],
  },

  classroom: {
    id: 'classroom',
    label: 'Classroom',
    emoji: '🏫',
    color: '#EE5A24',
    beaconId: 'beacon-classroom-001',
    suggestions: [
      { label: 'Teacher' },
      { label: 'Question' },
      { label: 'Help' },
      { label: 'Yes' },
      { label: 'No', arasaacId: '5526' },
      { label: 'Read' },
      { label: 'Write' },
      { label: 'Listen' },
      { label: 'Break' },
      { label: 'Bathroom',arasaacId: '38625' },
      { label: 'Done' },
      { label: 'More time', arasaacId: '11359' },
    ],
  },

  outside: {
    id: 'outside',
    label: 'Outside',
    emoji: '🌳',
    color: '#2ECC71',
    beaconId: 'beacon-outside-001',
    suggestions: [
      { label: 'Walk', arasaacId: '6044' },
      { label: 'Run', arasaacId: '6465' },
      { label: 'Play' },
      { label: 'Swing' },
      { label: 'Hot', arasaacId: '2300' },
      { label: 'Cold' },
      { label: 'Water', arasaacId: '2248' },
      { label: 'Go home' },
      { label: 'Stop' },
      { label: 'Look' },
      { label: 'Fun' },
      { label: 'Help' },
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