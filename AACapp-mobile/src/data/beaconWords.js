/**
 * Beacon-based word mappings for AAC application
 * Associates beacon IDs with context-specific words/phrases
 */

// Default words when no beacon is detected
export const defaultWords = [
  { id: 'default_hello', label: 'Hello' },
  { id: 'default_yes', label: 'Yes' },
  { id: 'default_no', label: 'No' },
  { id: 'default_help', label: 'Help' },
  { id: 'default_thanks', label: 'Thank you' },
  { id: 'default_more', label: 'More' },
];

// Beacon-specific word mappings
export const beaconWords = {
  beacon_kitchen: [
    { id: 'kitchen_hungry', label: 'I\'m hungry' },
    { id: 'kitchen_drink', label: 'I want a drink' },
    { id: 'kitchen_eat', label: 'Let\'s eat' },
    { id: 'kitchen_water', label: 'Water please' },
    { id: 'kitchen_snack', label: 'Snack' },
    { id: 'kitchen_breakfast', label: 'Breakfast' },
  ],
  beacon_living_room: [
    { id: 'living_watch', label: 'Watch TV' },
    { id: 'living_play', label: 'Play' },
    { id: 'living_sit', label: 'Sit down' },
    { id: 'living_movie', label: 'Movie' },
    { id: 'living_game', label: 'Game' },
    { id: 'living_music', label: 'Music' },
  ],
  beacon_bedroom: [
    { id: 'bedroom_sleep', label: 'Sleep' },
    { id: 'bedroom_rest', label: 'Rest' },
    { id: 'bedroom_bed', label: 'Bed' },
    { id: 'bedroom_tired', label: 'I\'m tired' },
    { id: 'bedroom_nap', label: 'Nap' },
    { id: 'bedroom_lights', label: 'Lights' },
  ],
  beacon_bathroom: [
    { id: 'bathroom_wash', label: 'Wash' },
    { id: 'bathroom_bathroom', label: 'Bathroom' },
    { id: 'bathroom_shower', label: 'Shower' },
    { id: 'bathroom_clean', label: 'Clean' },
    { id: 'bathroom_soap', label: 'Soap' },
    { id: 'bathroom_help', label: 'Help me' },
  ],
};

/**
 * Get words for a specific beacon ID
 * @param {string} beaconId - The beacon identifier
 * @returns {Array} Array of word objects for the beacon, or defaultWords if not found
 */
export const getWordsForBeacon = (beaconId) => {
  return beaconWords[beaconId] || defaultWords;
};
