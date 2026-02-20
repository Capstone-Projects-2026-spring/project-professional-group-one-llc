import { StatusBar } from 'expo-status-bar';
import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import useLocationDetection from './src/hooks/useLocationDetection';
import RoomSelector from './src/components/RoomSelector';
import { useSpeech } from './src/hooks/useSpeech'; //hook for tts functionality

const DEFAULT_SUGGESTIONS = [
  { label: 'Hello', emoji: '👋' },
  { label: 'Yes', emoji: '✅' },
  { label: 'No', emoji: '❌' },
  { label: 'Please', emoji: '🙏' },
  { label: 'Thank you', emoji: '😊' },
  { label: 'Help', emoji: '🆘' },
  { label: 'More', emoji: '➕' },
  { label: 'Done', emoji: '✔️' },
  { label: 'Wait', emoji: '✋' },
  { label: 'I want', emoji: '👉' },
  { label: 'I need', emoji: '💬' },
  { label: 'Go', emoji: '🚶' },
];

const CATEGORIES = {
  People: [
    { label: 'I', emoji: '🙋' },
    { label: 'You', emoji: '🫵' },
    { label: 'We', emoji: '👥' },
    { label: 'Mom', emoji: '👩' },
    { label: 'Dad', emoji: '👨' },
    { label: 'Friend', emoji: '🤝' },
    { label: 'Teacher', emoji: '👩‍🏫' },
    { label: 'Doctor', emoji: '👨‍⚕️' },
  ],
  Actions: [
    { label: 'Eat', emoji: '🍽️' },
    { label: 'Drink', emoji: '🥤' },
    { label: 'Play', emoji: '🎮' },
    { label: 'Read', emoji: '📖' },
    { label: 'Walk', emoji: '🚶' },
    { label: 'Sleep', emoji: '😴' },
    { label: 'Listen', emoji: '👂' },
    { label: 'Watch', emoji: '👀' },
  ],
  Feelings: [
    { label: 'Happy', emoji: '😄' },
    { label: 'Sad', emoji: '😢' },
    { label: 'Tired', emoji: '😩' },
    { label: 'Hungry', emoji: '🤤' },
    { label: 'Thirsty', emoji: '💧' },
    { label: 'Sick', emoji: '🤒' },
    { label: 'Excited', emoji: '🤩' },
    { label: 'Scared', emoji: '😨' },
  ],
  Places: [
    { label: 'Home', emoji: '🏠' },
    { label: 'School', emoji: '🏫' },
    { label: 'Outside', emoji: '🌳' },
    { label: 'Bathroom', emoji: '🚻' },
    { label: 'Kitchen', emoji: '🍳' },
    { label: 'Bedroom', emoji: '🛏️' },
    { label: 'Store', emoji: '🏪' },
    { label: 'Park', emoji: '🏞️' },
  ],
};

const CATEGORY_COLORS = {
  Suggested: '#6C63FF',
  People: '#FF6B6B',
  Actions: '#4ECDC4',
  Feelings: '#FFD93D',
  Places: '#95E1D3',
};

export default function App() {
  const [sentence, setSentence] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Suggested');

  // ── Room / location context ───────────────────────────────────
  const { currentRoom, allRooms, setRoomManually } = useLocationDetection();

  // Build the full category map with a dynamic "Suggested" category
  const categories = useMemo(() => {
    const suggested = currentRoom
      ? currentRoom.suggestions
      : DEFAULT_SUGGESTIONS;
    return { Suggested: suggested, ...CATEGORIES };
  }, [currentRoom]);

  const suggestedColor = currentRoom ? currentRoom.color : '#6C63FF';

  const addWord = (word) => {
    setSentence((prev) => [...prev, word]);
  };

  const removeLastWord = () => {
    setSentence((prev) => prev.slice(0, -1));
  };

  const clearSentence = () => {
    setSentence([]);
  };

  const speakSentence = () => {
    if (sentence.length === 0) return;
    const text = sentence.join(' ');
    Alert.alert('Speaking', text);
  };

  const words = categories[activeCategory] || [];

  const categoryColors = {
    ...CATEGORY_COLORS,
    Suggested: suggestedColor,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AAC Beacon</Text>
        <Text style={styles.headerSubtitle}>
          {currentRoom
            ? `📍 ${currentRoom.emoji} ${currentRoom.label}`
            : '📍 General'}
        </Text>
      </View>

      {/* Room Selector (placeholder for Bluetooth beacons) */}
      <RoomSelector
        rooms={allRooms}
        activeRoomId={currentRoom?.id ?? null}
        onSelectRoom={setRoomManually}
      />

      {/* Sentence Bar */}
      <View style={styles.sentenceBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sentenceScroll}
          contentContainerStyle={styles.sentenceContent}
        >
          {sentence.length === 0 ? (
            <Text style={styles.sentencePlaceholder}>
              Tap words below to build a sentence...
            </Text>
          ) : (
            sentence.map((word, i) => (
              <View key={i} style={styles.sentenceWord}>
                <Text style={styles.sentenceWordText}>{word}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.sentenceActions}>
          <TouchableOpacity onPress={removeLastWord} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>⌫</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearSentence} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>🗑️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={speakSentence}
            style={[styles.actionBtn, styles.speakBtn]}
          >
            <Text style={styles.speakBtnText}>🔊</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Word Grid */}
      <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid}>
        {words.map((word, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.tile,
              { backgroundColor: (categoryColors[activeCategory] || '#6C63FF') + '22' },
              { borderColor: categoryColors[activeCategory] || '#6C63FF' },
            ]}
            onPress={() => addWord(word.label)}
            activeOpacity={0.6}
          >
            <Text style={styles.tileEmoji}>{word.emoji}</Text>
            <Text style={styles.tileLabel}>{word.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Tabs */}
      <View style={styles.categoryBar}>
        {Object.keys(categories).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryTab,
              activeCategory === cat && {
                backgroundColor: categoryColors[cat] || '#6C63FF',
              },
            ]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === cat && styles.categoryTabTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  sentenceBar: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 16,
    padding: 12,
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sentenceScroll: {
    maxHeight: 40,
  },
  sentenceContent: {
    alignItems: 'center',
    gap: 6,
  },
  sentencePlaceholder: {
    color: '#aaa',
    fontSize: 16,
    fontStyle: 'italic',
  },
  sentenceWord: {
    backgroundColor: '#E8E5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sentenceWordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sentenceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 18,
  },
  speakBtn: {
    backgroundColor: '#6C63FF',
    width: 60,
  },
  speakBtnText: {
    fontSize: 20,
  },
  gridScroll: {
    flex: 1,
    marginTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    paddingBottom: 12,
  },
  tile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  tileEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  categoryBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 4,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
});
