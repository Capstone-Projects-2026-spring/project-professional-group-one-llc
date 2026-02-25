/**
 * AACScreen - Main screen for Augmentative and Alternative Communication
 * Displays context-specific words based on current beacon location
 * Includes demo buttons to simulate room changes
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useBeacon } from '../services/BeaconContext';
import { getWordsForBeacon } from '../data/beaconWords';
import { useSpeech } from '../hooks/useSpeech';

const AACScreen = () => {
  const { beaconId, setBeaconId } = useBeacon();
  const { speakText } = useSpeech();

  // Get words for current beacon
  const currentWords = getWordsForBeacon(beaconId);

  const handleWordPress = (word) => {
    // Speak the word
    speakText(word.label);

    // Optional: Show visual feedback
    Alert.alert('Word Selected', word.label, [{ text: 'OK' }]);
  };

  const handleRoomChange = (roomBeaconId) => {
    setBeaconId(roomBeaconId);
  };

  const handleClearBeacon = () => {
    setBeaconId(null);
  };

  const demoRooms = [
    { beaconId: 'beacon_kitchen', label: 'Go to Kitchen' },
    { beaconId: 'beacon_living_room', label: 'Go to Living Room' },
    { beaconId: 'beacon_bedroom', label: 'Go to Bedroom' },
    { beaconId: 'beacon_bathroom', label: 'Go to Bathroom' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AAC Application</Text>
          <Text style={styles.beaconInfo}>
            {beaconId ? `📍 ${beaconId}` : '📍 No beacon detected'}
          </Text>
        </View>

        {/* Word Grid Section */}
        <View style={styles.wordsSection}>
          <Text style={styles.sectionTitle}>Available Words</Text>
          <View style={styles.wordGrid}>
            {currentWords.map((word) => (
              <TouchableOpacity
                key={word.id}
                style={styles.wordButton}
                onPress={() => handleWordPress(word)}
              >
                <Text style={styles.wordButtonText}>{word.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Demo Room Navigation Section */}
        <View style={styles.demoSection}>
          <Text style={styles.sectionTitle}>Demo: Change Rooms</Text>
          <Text style={styles.demoDescription}>
            Tap a room to simulate beacon detection:
          </Text>
          {demoRooms.map((room) => (
            <TouchableOpacity
              key={room.beaconId}
              style={styles.demoButton}
              onPress={() => handleRoomChange(room.beaconId)}
            >
              <Text style={styles.demoButtonText}>{room.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.demoButton, styles.clearButton]}
            onPress={handleClearBeacon}
          >
            <Text style={styles.demoButtonText}>Clear Beacon</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  beaconInfo: {
    fontSize: 16,
    color: '#666',
  },
  wordsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  wordButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginBottom: 8,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  wordButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  demoSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  demoDescription: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  demoButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: '#f44336',
    marginTop: 8,
  },
});

export default AACScreen;
