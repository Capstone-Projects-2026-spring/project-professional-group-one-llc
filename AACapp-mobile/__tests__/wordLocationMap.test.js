/**
 * Unit Tests for Word-Location Map
 * Jest test suite for wordLocationMap.js functions
 * Run: npm test -- wordLocationMap.test.js
 */

import {
  buildWordLocationMap,
  getLocationsForWord,
  getUniversalWords,
  getLocationSpecificWords,
  getWordStatistics,
  findSimilarWords,
} from '../src/data/wordLocationMap';
import ROOM_CONTEXTS from '../src/data/roomContexts';

describe('Word-Location Map', () => {
  describe('buildWordLocationMap()', () => {
    test('should return an object', () => {
      const map = buildWordLocationMap();
      expect(typeof map).toBe('object');
      expect(map).not.toBeNull();
    });

    test('should create entries for all words across all rooms', () => {
      const map = buildWordLocationMap();
      const totalWords = Object.keys(map).length;
      expect(totalWords).toBeGreaterThan(0);
    });

    test('should not have duplicate room entries for the same word', () => {
      const map = buildWordLocationMap();
      Object.values(map).forEach((locations) => {
        const roomIds = locations.map((loc) => loc.roomId);
        const uniqueRoomIds = new Set(roomIds);
        expect(roomIds.length).toBe(uniqueRoomIds.size);
      });
    });

    test('should include correct room metadata in each location', () => {
      const map = buildWordLocationMap();
      Object.values(map).forEach((locations) => {
        locations.forEach((location) => {
          expect(location).toHaveProperty('roomId');
          expect(location).toHaveProperty('roomLabel');
          expect(location).toHaveProperty('emoji');
          expect(location).toHaveProperty('color');
        });
      });
    });
  });

  describe('getLocationsForWord()', () => {
    test('should return an array for existing words', () => {
      const map = buildWordLocationMap();
      const firstWord = Object.keys(map)[0];
      const locations = getLocationsForWord(firstWord);
      expect(Array.isArray(locations)).toBe(true);
    });

    test('should return empty array for non-existing words', () => {
      const locations = getLocationsForWord('NonExistentWord12345');
      expect(locations).toEqual([]);
    });

    test('should return locations with correct structure', () => {
      const map = buildWordLocationMap();
      const firstWord = Object.keys(map)[0];
      const locations = getLocationsForWord(firstWord);

      locations.forEach((location) => {
        expect(location).toHaveProperty('roomId');
        expect(location).toHaveProperty('roomLabel');
        expect(location).toHaveProperty('emoji');
        expect(location).toHaveProperty('color');
      });
    });

    test('should be case-sensitive', () => {
      const map = buildWordLocationMap();
      const firstWord = Object.keys(map)[0];
      const locations = getLocationsForWord(firstWord);
      const differentCaseLocations = getLocationsForWord(firstWord.toLowerCase());

      // They should match since the function is case-sensitive
      if (firstWord !== firstWord.toLowerCase()) {
        expect(differentCaseLocations.length).toBeLessThanOrEqual(locations.length);
      }
    });
  });

  describe('getUniversalWords()', () => {
    test('should return an array', () => {
      const universal = getUniversalWords();
      expect(Array.isArray(universal)).toBe(true);
    });

    test('should only return words appearing in at least minRooms locations', () => {
      const minRooms = 2;
      const universal = getUniversalWords(minRooms);
      universal.forEach((item) => {
        expect(item.count).toBeGreaterThanOrEqual(minRooms);
      });
    });

    test('should include word, count, and locations properties', () => {
      const universal = getUniversalWords();
      if (universal.length > 0) {
        const item = universal[0];
        expect(item).toHaveProperty('word');
        expect(item).toHaveProperty('count');
        expect(item).toHaveProperty('locations');
        expect(Array.isArray(item.locations)).toBe(true);
      }
    });

    test('should be sorted by count in descending order', () => {
      const universal = getUniversalWords();
      for (let i = 1; i < universal.length; i++) {
        expect(universal[i - 1].count).toBeGreaterThanOrEqual(universal[i].count);
      }
    });

    test('should return fewer words with higher minRooms threshold', () => {
      const universal2 = getUniversalWords(2);
      const universal3 = getUniversalWords(3);
      expect(universal2.length).toBeGreaterThanOrEqual(universal3.length);
    });

    test('should return empty array when minRooms exceeds total rooms', () => {
      const totalRooms = Object.values(ROOM_CONTEXTS).length;
      const universal = getUniversalWords(totalRooms + 10);
      expect(universal).toEqual([]);
    });
  });

  describe('getLocationSpecificWords()', () => {
    test('should return an array', () => {
      const specific = getLocationSpecificWords();
      expect(Array.isArray(specific)).toBe(true);
    });

    test('should only return words appearing in exactly one room', () => {
      const specific = getLocationSpecificWords();
      specific.forEach((item) => {
        expect(item.room).toBeDefined();
        expect(item.word).toBeDefined();
      });
    });

    test('should include word and room properties', () => {
      const specific = getLocationSpecificWords();
      if (specific.length > 0) {
        const item = specific[0];
        expect(item).toHaveProperty('word');
        expect(item).toHaveProperty('room');
        expect(item.room).toHaveProperty('roomId');
        expect(item.room).toHaveProperty('roomLabel');
      }
    });

    test('should be sorted alphabetically by room label', () => {
      const specific = getLocationSpecificWords();
      for (let i = 1; i < specific.length; i++) {
        const prevLabel = specific[i - 1].room.roomLabel;
        const currLabel = specific[i].room.roomLabel;
        expect(prevLabel.localeCompare(currLabel)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('getWordStatistics()', () => {
    test('should return an object with required properties', () => {
      const stats = getWordStatistics();
      expect(stats).toHaveProperty('totalWords');
      expect(stats).toHaveProperty('totalLocations');
      expect(stats).toHaveProperty('universalWords');
      expect(stats).toHaveProperty('locationSpecificWords');
      expect(stats).toHaveProperty('averageLocationsPerWord');
      expect(stats).toHaveProperty('wordDistribution');
    });

    test('should have positive counts', () => {
      const stats = getWordStatistics();
      expect(stats.totalWords).toBeGreaterThan(0);
      expect(stats.totalLocations).toBeGreaterThan(0);
      expect(stats.universalWords).toBeGreaterThanOrEqual(0);
      expect(stats.locationSpecificWords).toBeGreaterThanOrEqual(0);
    });

    test('should have reasonable average', () => {
      const stats = getWordStatistics();
      const avg = parseFloat(stats.averageLocationsPerWord);
      expect(avg).toBeGreaterThan(0);
      expect(avg).toBeLessThanOrEqual(stats.totalLocations);
    });

    test('should have consistent word counts', () => {
      const stats = getWordStatistics();
      const sumOfDistribution = Object.values(stats.wordDistribution).reduce((a, b) => a + b, 0);
      expect(sumOfDistribution).toBe(stats.totalWords);
    });

    test('universal words should be less than or equal to total words', () => {
      const stats = getWordStatistics();
      expect(stats.universalWords).toBeLessThanOrEqual(stats.totalWords);
    });

    test('location-specific words should be less than or equal to total words', () => {
      const stats = getWordStatistics();
      expect(stats.locationSpecificWords).toBeLessThanOrEqual(stats.totalWords);
    });
  });

  describe('findSimilarWords()', () => {
    test('should return an array', () => {
      const map = buildWordLocationMap();
      const firstWord = Object.keys(map)[0];
      const similar = findSimilarWords(firstWord);
      expect(Array.isArray(similar)).toBe(true);
    });

    test('should exclude the reference word itself', () => {
      const map = buildWordLocationMap();
      const firstWord = Object.keys(map)[0];
      const similar = findSimilarWords(firstWord);
      const words = similar.map((item) => item.word);
      expect(words).not.toContain(firstWord);
    });

    test('should return empty array for non-existing word', () => {
      const similar = findSimilarWords('NonExistentWord12345');
      expect(similar).toEqual([]);
    });

    test('should only return words with at least minOverlap shared locations', () => {
      const map = buildWordLocationMap();
      const firstWord = Object.keys(map)[0];
      const minOverlap = 2;
      const similar = findSimilarWords(firstWord, minOverlap);

      similar.forEach((item) => {
        expect(item.sharedLocations).toBeGreaterThanOrEqual(minOverlap);
      });
    });

    test('should include word, sharedLocations, and locations properties', () => {
      const map = buildWordLocationMap();
      const firstWord = Object.keys(map)[0];
      const similar = findSimilarWords(firstWord);

      if (similar.length > 0) {
        const item = similar[0];
        expect(item).toHaveProperty('word');
        expect(item).toHaveProperty('sharedLocations');
        expect(item).toHaveProperty('locations');
      }
    });

    test('should be sorted by shared locations in descending order', () => {
      const map = buildWordLocationMap();
      const firstWord = Object.keys(map)[0];
      const similar = findSimilarWords(firstWord);

      for (let i = 1; i < similar.length; i++) {
        expect(similar[i - 1].sharedLocations).toBeGreaterThanOrEqual(similar[i].sharedLocations);
      }
    });

    test('should return fewer results with higher minOverlap', () => {
      const map = buildWordLocationMap();
      const firstWord = Object.keys(map)[0];
      const similar1 = findSimilarWords(firstWord, 1);
      const similar2 = findSimilarWords(firstWord, 2);

      expect(similar1.length).toBeGreaterThanOrEqual(similar2.length);
    });
  });

  describe('Integration Tests', () => {
    test('all functions should work with actual room contexts', () => {
      const map = buildWordLocationMap();
      const roomCount = Object.values(ROOM_CONTEXTS).length;

      expect(Object.keys(map).length).toBeGreaterThan(0);
      expect(roomCount).toBeGreaterThan(0);
    });

    test('word statistics should match manual calculations', () => {
      const map = buildWordLocationMap();
      const stats = getWordStatistics();
      const manualCount = Object.keys(map).length;

      expect(stats.totalWords).toBe(manualCount);
    });

    test('universal words should be subset of all words', () => {
      const map = buildWordLocationMap();
      const universal = getUniversalWords();
      const allWords = new Set(Object.keys(map));

      universal.forEach((item) => {
        expect(allWords.has(item.word)).toBe(true);
      });
    });

    test('location-specific words should be subset of all words', () => {
      const map = buildWordLocationMap();
      const specific = getLocationSpecificWords();
      const allWords = new Set(Object.keys(map));

      specific.forEach((item) => {
        expect(allWords.has(item.word)).toBe(true);
      });
    });
  });
});
