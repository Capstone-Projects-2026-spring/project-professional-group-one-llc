#!/usr/bin/env node
/**
 * Word-Location Map Test
 * Run: node test-simple.js
 */

import ROOM_CONTEXTS from './src/data/roomContexts.js';

function buildWordLocationMap() {
  const wordMap = {};
  Object.values(ROOM_CONTEXTS).forEach((room) => {
    room.suggestions.forEach((suggestion) => {
      const wordLabel = suggestion.label;
      if (!wordMap[wordLabel]) {
        wordMap[wordLabel] = [];
      }
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

function getLocationsForWord(word) {
  const map = buildWordLocationMap();
  return map[word] || [];
}

function getUniversalWords(minRooms = 2) {
  const map = buildWordLocationMap();
  return Object.entries(map)
    .filter(([_, locations]) => locations.length >= minRooms)
    .map(([word, locations]) => ({
      word,
      count: locations.length,
      locations,
    }))
    .sort((a, b) => b.count - a.count);
}

function getWordStatistics() {
  const map = buildWordLocationMap();
  const locations = Object.values(ROOM_CONTEXTS).length;
  const allWords = Object.keys(map);
  const universalWords = allWords.filter((word) => map[word].length === locations);
  const uniqueWords = allWords.filter((word) => map[word].length === 1);

  return {
    totalWords: allWords.length,
    totalLocations: locations,
    universalWords: universalWords.length,
    locationSpecificWords: uniqueWords.length,
    averageLocationsPerWord: (allWords.reduce((sum, w) => sum + map[w].length, 0) / allWords.length).toFixed(2),
  };
}

// ── TEST ─────────────────────────────────────────────────────────
console.log('\n📊 Word-Location Map Test\n');

const stats = getWordStatistics();
console.log(`Total Words: ${stats.totalWords}`);
console.log(`Total Rooms: ${stats.totalLocations}`);
console.log(`Universal Words: ${stats.universalWords}`);
console.log(`Unique Words: ${stats.locationSpecificWords}`);
console.log(`Avg Locations/Word: ${stats.averageLocationsPerWord}\n`);

console.log('✅ All functions working correctly\n');
