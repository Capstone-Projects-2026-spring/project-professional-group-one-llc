/**
 * Word-Location Map
 * ─────────────────
 * Inverted index that maps each word to all locations where it appears.
 * Useful for:
 * - Finding which rooms use a specific word
 * - Identifying universal vs. location-specific words
 * - Analytics and usage tracking
 * - Smart search and recommendations
 */

import ROOM_CONTEXTS from './roomContexts';

/**
 * Build a map of word → [locations where word appears]
 * Returns: { wordLabel: [{ roomId, roomLabel, emoji, color }] }
 */
export function buildWordLocationMap() {
  const wordMap = {};

  // Iterate through all rooms and their suggestions
  Object.values(ROOM_CONTEXTS).forEach((room) => {
    room.suggestions.forEach((suggestion) => {
      const wordLabel = suggestion.label;

      // Initialize if word not yet seen
      if (!wordMap[wordLabel]) {
        wordMap[wordLabel] = [];
      }

      // Add this room to the word's locations (avoid duplicates)
      if (!wordMap[wordLabel].some((loc) => loc.roomId === room.id)) {
        wordMap[wordLabel].push({
          roomId: room.id,
          roomLabel: room.label,
          emoji: room.emoji,
          color: room.color,
        });
      }
    });
  });

  return wordMap;
}

/**
 * Find all locations where a specific word appears
 * @param {string} word - The word label to search for
 * @returns {Array} Array of locations using this word
 */
export function getLocationsForWord(word) {
  const map = buildWordLocationMap();
  return map[word] || [];
}

/**
 * Find words that appear in all/most locations (universal words)
 * @param {number} minRooms - Minimum number of rooms word must appear in
 * @returns {Array} Words that appear in at least minRooms locations
 */
export function getUniversalWords(minRooms = 2) {
  const map = buildWordLocationMap();
  return Object.entries(map)
    .filter(([_, locations]) => locations.length >= minRooms)
    .map(([word, locations]) => ({
      word,
      count: locations.length,
      locations,
    }))
    .sort((a, b) => b.count - a.count); // Most common first
}

/**
 * Find unique words that only appear in one location
 * @returns {Array} Words specific to individual rooms
 */
export function getLocationSpecificWords() {
  const map = buildWordLocationMap();
  return Object.entries(map)
    .filter(([_, locations]) => locations.length === 1)
    .map(([word, locations]) => ({
      word,
      room: locations[0],
    }))
    .sort((a, b) => a.room.roomLabel.localeCompare(b.room.roomLabel));
}

/**
 * Get statistics about word distribution across locations
 * @returns {Object} Stats including total words, unique words, avg words per room, etc.
 */
export function getWordStatistics() {
  const map = buildWordLocationMap();
  const locations = Object.values(ROOM_CONTEXTS).length;
  const allWords = Object.keys(map);
  const universalWords = allWords.filter((word) => map[word].length === locations);
  const uniqueWords = allWords.filter((word) => map[word].length === 1);

  const wordDistribution = {};
  allWords.forEach((word) => {
    const count = map[word].length;
    wordDistribution[count] = (wordDistribution[count] || 0) + 1;
  });

  return {
    totalWords: allWords.length,
    totalLocations: locations,
    universalWords: universalWords.length,
    locationSpecificWords: uniqueWords.length,
    averageLocationsPerWord: (allWords.reduce((sum, w) => sum + map[w].length, 0) / allWords.length).toFixed(2),
    wordDistribution, // { 1: 5, 2: 10, 3: 8 } means 5 words appear in 1 location, 10 in 2, etc.
  };
}

/**
 * Find similar words (appear in many of the same locations)
 * @param {string} word - The reference word
 * @param {number} minOverlap - Minimum shared locations (default 1)
 * @returns {Array} Similar words with overlap count
 */
export function findSimilarWords(word, minOverlap = 1) {
  const map = buildWordLocationMap();
  const targetLocations = map[word];

  if (!targetLocations) return [];

  const targetRoomIds = new Set(targetLocations.map((loc) => loc.roomId));

  return Object.entries(map)
    .filter(([w, locations]) => {
      if (w === word) return false; // Exclude the word itself
      const overlap = locations.filter((loc) => targetRoomIds.has(loc.roomId)).length;
      return overlap >= minOverlap;
    })
    .map(([w, locations]) => {
      const overlap = locations.filter((loc) => targetRoomIds.has(loc.roomId)).length;
      return { word: w, sharedLocations: overlap, locations };
    })
    .sort((a, b) => b.sharedLocations - a.sharedLocations);
}

export default buildWordLocationMap();
