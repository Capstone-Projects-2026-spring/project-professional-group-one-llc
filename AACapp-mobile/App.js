// import { StatusBar } from 'expo-status-bar';
// import { useState, useMemo } from 'react';
// import {
//   StyleSheet,
//   Text,
//   View,
//   TouchableOpacity,
//   ScrollView,
//   SafeAreaView,
//   Alert,
// } from 'react-native';
// import useLocationDetection from './src/hooks/useLocationDetection';
// import RoomSelector from './src/components/RoomSelector';
// import { NativeModules } from 'react-native';
// console.log('[TEST] BLEBeaconModule:', JSON.stringify(NativeModules.BLEBeaconModule));

// const DEFAULT_SUGGESTIONS = [
//   { label: 'Hello', emoji: '👋' },
//   { label: 'Yes', emoji: '✅' },
//   { label: 'No', emoji: '❌' },
//   { label: 'Please', emoji: '🙏' },
//   { label: 'Thank you', emoji: '😊' },
//   { label: 'Help', emoji: '🆘' },
//   { label: 'More', emoji: '➕' },
//   { label: 'Done', emoji: '✔️' },
//   { label: 'Wait', emoji: '✋' },
//   { label: 'I want', emoji: '👉' },
//   { label: 'I need', emoji: '💬' },
//   { label: 'Go', emoji: '🚶' },
// ];

// const CATEGORIES = {
//   People: [
//     { label: 'I', emoji: '🙋' },
//     { label: 'You', emoji: '🫵' },
//     { label: 'We', emoji: '👥' },
//     { label: 'Mom', emoji: '👩' },
//     { label: 'Dad', emoji: '👨' },
//     { label: 'Friend', emoji: '🤝' },
//     { label: 'Teacher', emoji: '👩‍🏫' },
//     { label: 'Doctor', emoji: '👨‍⚕️' },
//   ],
//   Actions: [
//     { label: 'Eat', emoji: '🍽️' },
//     { label: 'Drink', emoji: '🥤' },
//     { label: 'Play', emoji: '🎮' },
//     { label: 'Read', emoji: '📖' },
//     { label: 'Walk', emoji: '🚶' },
//     { label: 'Sleep', emoji: '😴' },
//     { label: 'Listen', emoji: '👂' },
//     { label: 'Watch', emoji: '👀' },
//   ],
//   Feelings: [
//     { label: 'Happy', emoji: '😄' },
//     { label: 'Sad', emoji: '😢' },
//     { label: 'Tired', emoji: '😩' },
//     { label: 'Hungry', emoji: '🤤' },
//     { label: 'Thirsty', emoji: '💧' },
//     { label: 'Sick', emoji: '🤒' },
//     { label: 'Excited', emoji: '🤩' },
//     { label: 'Scared', emoji: '😨' },
//   ],
//   Places: [
//     { label: 'Home', emoji: '🏠' },
//     { label: 'School', emoji: '🏫' },
//     { label: 'Outside', emoji: '🌳' },
//     { label: 'Bathroom', emoji: '🚻' },
//     { label: 'Kitchen', emoji: '🍳' },
//     { label: 'Bedroom', emoji: '🛏️' },
//     { label: 'Store', emoji: '🏪' },
//     { label: 'Park', emoji: '🏞️' },
//   ],
// };

// const CATEGORY_COLORS = {
//   Suggested: '#6C63FF',
//   People: '#FF6B6B',
//   Actions: '#4ECDC4',
//   Feelings: '#FFD93D',
//   Places: '#95E1D3',
// };

// export default function App() {
//   const [sentence, setSentence] = useState([]);
//   const [activeCategory, setActiveCategory] = useState('Suggested');

//   // ── Room / location context ───────────────────────────────────
//   const { currentRoom, allRooms, setRoomManually } = useLocationDetection();

//   // Build the full category map with a dynamic "Suggested" category
//   const categories = useMemo(() => {
//     const suggested = currentRoom
//       ? currentRoom.suggestions
//       : DEFAULT_SUGGESTIONS;
//     return { Suggested: suggested, ...CATEGORIES };
//   }, [currentRoom]);

//   const suggestedColor = currentRoom ? currentRoom.color : '#6C63FF';

//   const addWord = (word) => {
//     setSentence((prev) => [...prev, word]);
//   };

//   const removeLastWord = () => {
//     setSentence((prev) => prev.slice(0, -1));
//   };

//   const clearSentence = () => {
//     setSentence([]);
//   };

//   const speakSentence = () => {
//     if (sentence.length === 0) return;
//     const text = sentence.join(' ');
//     Alert.alert('Speaking', text);
//   };

//   const words = categories[activeCategory] || [];

//   const categoryColors = {
//     ...CATEGORY_COLORS,
//     Suggested: suggestedColor,
//   };

//   return (
//     <SafeAreaView style={styles.safe}>
//       <StatusBar style="dark" />

//       {/* Header */}
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>AAC Beacon</Text>
//         <Text style={styles.headerSubtitle}>
//           {currentRoom
//             ? `📍 ${currentRoom.emoji} ${currentRoom.label}`
//             : '📍 General'}
//         </Text>
//       </View>

//       {/* Room Selector (placeholder for Bluetooth beacons) */}
//       <RoomSelector
//         rooms={allRooms}
//         activeRoomId={currentRoom?.id ?? null}
//         onSelectRoom={setRoomManually}
//       />

//       {/* Sentence Bar */}
//       <View style={styles.sentenceBar}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.sentenceScroll}
//           contentContainerStyle={styles.sentenceContent}
//         >
//           {sentence.length === 0 ? (
//             <Text style={styles.sentencePlaceholder}>
//               Tap words below to build a sentence...
//             </Text>
//           ) : (
//             sentence.map((word, i) => (
//               <View key={i} style={styles.sentenceWord}>
//                 <Text style={styles.sentenceWordText}>{word}</Text>
//               </View>
//             ))
//           )}
//         </ScrollView>
//         <View style={styles.sentenceActions}>
//           <TouchableOpacity onPress={removeLastWord} style={styles.actionBtn}>
//             <Text style={styles.actionBtnText}>⌫</Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={clearSentence} style={styles.actionBtn}>
//             <Text style={styles.actionBtnText}>🗑️</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             onPress={speakSentence}
//             style={[styles.actionBtn, styles.speakBtn]}
//           >
//             <Text style={styles.speakBtnText}>🔊</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Word Grid */}
//       <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid}>
//         {words.map((word, i) => (
//           <TouchableOpacity
//             key={i}
//             style={[
//               styles.tile,
//               { backgroundColor: (categoryColors[activeCategory] || '#6C63FF') + '22' },
//               { borderColor: categoryColors[activeCategory] || '#6C63FF' },
//             ]}
//             onPress={() => addWord(word.label)}
//             activeOpacity={0.6}
//           >
//             <Text style={styles.tileEmoji}>{word.emoji}</Text>
//             <Text style={styles.tileLabel}>{word.label}</Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       {/* Category Tabs */}
//       <View style={styles.categoryBar}>
//         {Object.keys(categories).map((cat) => (
//           <TouchableOpacity
//             key={cat}
//             style={[
//               styles.categoryTab,
//               activeCategory === cat && {
//                 backgroundColor: categoryColors[cat] || '#6C63FF',
//               },
//             ]}
//             onPress={() => setActiveCategory(cat)}
//           >
//             <Text
//               style={[
//                 styles.categoryTabText,
//                 activeCategory === cat && styles.categoryTabTextActive,
//               ]}
//             >
//               {cat}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safe: {
//     flex: 1,
//     backgroundColor: '#F8F9FA',
//   },
//   header: {
//     paddingHorizontal: 20,
//     paddingTop: 10,
//     paddingBottom: 8,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   headerTitle: {
//     fontSize: 22,
//     fontWeight: '700',
//     color: '#1a1a2e',
//   },
//   headerSubtitle: {
//     fontSize: 14,
//     color: '#666',
//   },
//   sentenceBar: {
//     backgroundColor: '#fff',
//     marginHorizontal: 12,
//     borderRadius: 16,
//     padding: 12,
//     minHeight: 70,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.08,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   sentenceScroll: {
//     maxHeight: 40,
//   },
//   sentenceContent: {
//     alignItems: 'center',
//     gap: 6,
//   },
//   sentencePlaceholder: {
//     color: '#aaa',
//     fontSize: 16,
//     fontStyle: 'italic',
//   },
//   sentenceWord: {
//     backgroundColor: '#E8E5FF',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//   },
//   sentenceWordText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//   },
//   sentenceActions: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     gap: 8,
//     marginTop: 8,
//   },
//   actionBtn: {
//     width: 44,
//     height: 36,
//     borderRadius: 10,
//     backgroundColor: '#eee',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   actionBtnText: {
//     fontSize: 18,
//   },
//   speakBtn: {
//     backgroundColor: '#6C63FF',
//     width: 60,
//   },
//   speakBtnText: {
//     fontSize: 20,
//   },
//   gridScroll: {
//     flex: 1,
//     marginTop: 12,
//   },
//   grid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     paddingHorizontal: 12,
//     gap: 10,
//     paddingBottom: 12,
//   },
//   tile: {
//     width: '30%',
//     aspectRatio: 1,
//     borderRadius: 16,
//     borderWidth: 2,
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 8,
//   },
//   tileEmoji: {
//     fontSize: 36,
//     marginBottom: 4,
//   },
//   tileLabel: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#333',
//     textAlign: 'center',
//   },
//   categoryBar: {
//     flexDirection: 'row',
//     paddingHorizontal: 8,
//     paddingVertical: 10,
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//     gap: 4,
//   },
//   categoryTab: {
//     flex: 1,
//     paddingVertical: 8,
//     borderRadius: 12,
//     alignItems: 'center',
//     backgroundColor: '#F0F0F0',
//   },
//   categoryTabText: {
//     fontSize: 11,
//     fontWeight: '600',
//     color: '#666',
//   },
//   categoryTabTextActive: {
//     color: '#fff',
//   },
// });

import { StatusBar } from 'expo-status-bar';
import { useState, useMemo, useCallback } from 'react';
import { SafeAreaView, View, useWindowDimensions } from 'react-native';
import useLocationDetection from './src/hooks/useLocationDetection';
import useSentenceBuilder from './src/hooks/useSentenceBuilder';
import useInteractionLogger from './src/hooks/useInteractionLogger';
import { useLocationAwareBLE } from './src/hooks/useLocationAwareBLE';
import RoomSelector from './src/components/RoomSelector';
import AppHeader from './src/components/AppHeader';
import SettingsMenuOverlay from './src/components/SettingsMenuOverlay';
import InteractionLogModal from './src/components/InteractionLogModal';
import SentenceBar from './src/components/SentenceBar';
import WordGrid from './src/components/WordGrid';
import { DEFAULT_SUGGESTIONS, CORE_WORDS } from './src/constants/aacVocabulary';
import styles from './src/styles/appStyles';

// ── Beacon → Room mapping ─────────────────────────────────────────────────────
// Map iBeacon major/minor values to room IDs defined in src/data/roomContexts.js
// Add one entry per physical beacon you have deployed.
//
// How to find your beacon's major/minor:
//   Run the app, walk near a beacon, watch logcat for:
//   "[BLE] ✅ iBeacon: uuid=... major=X minor=Y rssi=..."
//   Then add that major/minor pair here with the matching roomId.
const BEACON_ROOM_MAP = [
  { major: 1, minor: 1, roomId: 'bedroom' },
  { major: 1, minor: 2, roomId: 'kitchen' },
  { major: 1, minor: 3, roomId: 'bathroom' },
  { major: 1, minor: 4, roomId: 'living_room' },
];

// Ignore beacons weaker than this — prevents far-away beacons triggering room switches
const RSSI_THRESHOLD = -80;

function beaconToRoomId(uuid, major, minor, rssi) {
  if (rssi < RSSI_THRESHOLD) return null;
  const match = BEACON_ROOM_MAP.find(
    (entry) => entry.major === major && entry.minor === minor
  );
  return match?.roomId ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function mergeUniqueWords(primaryWords, secondaryWords) {
  const seen   = new Set();
  const merged = [];
  for (const word of [...primaryWords, ...secondaryWords]) {
    const key = word.label.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(word);
  }
  return merged;
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '').trim();
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  if (full.length !== 6) return `rgba(46, 204, 113, ${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [isLogsVisible,     setIsLogsVisible]     = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [gridScroll, setGridScroll] = useState({
    progress: 0, thumbRatio: 1, scrollable: false,
  });

  const { width, height }                          = useWindowDimensions();
  const { currentRoom, allRooms, setRoomManually } = useLocationDetection();
  const { interactionLogs, logButtonPress }         = useInteractionLogger(currentRoom);

  // ── BLE room detection ─────────────────────────────────────────────────────
  // Android: polls every 3 s via BLEBeaconModule (Kotlin native module).
  // iOS:     no-op stub — room switching still works via manual RoomSelector.
  useLocationAwareBLE({
    onBeacon: ({ uuid, major, minor, rssi }) => {
      const roomId = beaconToRoomId(uuid, major, minor, rssi);
      if (roomId && roomId !== currentRoom?.id) {
        console.log(`[BLE] Room detected: ${roomId} (major=${major} minor=${minor} rssi=${rssi})`);
        setRoomManually(roomId);
      }
    },
    onError: ({ message }) => {
      // Non-fatal — app still fully usable, room switching falls back to manual
      console.warn('[BLE]', message);
    },
  });

  // ── Layout ─────────────────────────────────────────────────────────────────
  const smallestSide   = Math.min(width, height);
  const uiScale        = Math.max(0.85, Math.min(1.35, smallestSide / 390));
  const isTablet       = smallestSide >= 768;
  const roomRailWidth  = Math.round((isTablet ? 102 : 78) * uiScale);
  const indicatorWidth = Math.max(4, Math.round(4 * uiScale));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOpenLogs = useCallback(() => {
    logButtonPress('view_logs');
    setIsLogsVisible(true);
  }, [logButtonPress]);

  const handleOpenSettings = useCallback(() => {
    logButtonPress('open_settings');
    setIsSettingsVisible(true);
  }, [logButtonPress]);

  const handleCloseSettings    = useCallback(() => setIsSettingsVisible(false), []);
  const handleCloseLogs        = useCallback(() => setIsLogsVisible(false), []);

  const handleOpenLogsFromSettings = useCallback(() => {
    setIsSettingsVisible(false);
    handleOpenLogs();
  }, [handleOpenLogs]);

  const handleGridScrollMetrics = useCallback(
    ({ offsetY, contentHeight, viewportHeight }) => {
      const maxOffset  = Math.max(0, contentHeight - viewportHeight);
      const scrollable = maxOffset > 0;
      const progress   = scrollable ? Math.max(0, Math.min(1, offsetY / maxOffset)) : 0;
      const ratio      = scrollable
        ? Math.max(0.2, Math.min(1, viewportHeight / contentHeight))
        : 1;
      setGridScroll((prev) => {
        if (
          prev.progress   === progress &&
          prev.thumbRatio === ratio    &&
          prev.scrollable === scrollable
        ) return prev;
        return { progress, thumbRatio: ratio, scrollable };
      });
    },
    [],
  );

  const handleSelectRoom = useCallback(
    (roomId) => {
      setRoomManually(roomId);
      const selectedRoom = roomId
        ? (allRooms.find((r) => r.id === roomId) ?? null)
        : null;
      const roomLabel = selectedRoom?.label ?? 'General';
      logButtonPress('room_selector', {
        selectedRoomId:    roomId ?? 'general',
        selectedRoomLabel: roomLabel,
        location: { id: selectedRoom?.id ?? 'general', label: roomLabel },
      });
    },
    [allRooms, logButtonPress, setRoomManually],
  );

  const {
    sentence, addWord, removeLastWord, clearSentence, speakSentence,
  } = useSentenceBuilder({ onLogPress: logButtonPress });

  // ── Words ──────────────────────────────────────────────────────────────────
  const words = useMemo(() => {
    const roomWords = currentRoom ? currentRoom.suggestions : DEFAULT_SUGGESTIONS;
    return mergeUniqueWords(CORE_WORDS, roomWords);
  }, [currentRoom]);

  const suggestedColor      = currentRoom ? currentRoom.color : '#6C63FF';
  const activeCategoryColor = suggestedColor;
  const indicatorTrackColor = hexToRgba(activeCategoryColor, 0.24);
  const indicatorThumbColor = activeCategoryColor;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <AppHeader onOpenSettings={handleOpenSettings} uiScale={uiScale} />
      <SentenceBar
        sentence={sentence}
        onRemoveLastWord={removeLastWord}
        onClearSentence={clearSentence}
        onSpeakSentence={speakSentence}
        uiScale={uiScale}
      />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <WordGrid
          words={words}
          activeCategoryColor={activeCategoryColor}
          onAddWord={addWord}
          uiScale={uiScale}
          onScrollMetricsChange={handleGridScrollMetrics}
        />
        {gridScroll.scrollable ? (
          <View
            style={{
              width:           indicatorWidth,
              marginRight:     Math.round(4 * uiScale),
              marginTop:       Math.round(12 * uiScale),
              marginBottom:    Math.round(12 * uiScale),
              borderRadius:    999,
              backgroundColor: indicatorTrackColor,
              overflow:        'hidden',
            }}
          >
            <View
              style={{
                position:        'absolute',
                left:            0,
                right:           0,
                top:             `${gridScroll.progress * (1 - gridScroll.thumbRatio) * 100}%`,
                height:          `${gridScroll.thumbRatio * 100}%`,
                borderRadius:    999,
                backgroundColor: indicatorThumbColor,
              }}
            />
          </View>
        ) : null}
        <RoomSelector
          rooms={allRooms}
          activeRoomId={currentRoom?.id ?? null}
          onSelectRoom={handleSelectRoom}
          uiScale={uiScale}
          railWidth={roomRailWidth}
        />
      </View>
      <InteractionLogModal
        visible={isLogsVisible}
        logs={interactionLogs}
        onClose={handleCloseLogs}
      />
      <SettingsMenuOverlay
        visible={isSettingsVisible}
        onClose={handleCloseSettings}
        onViewLogs={handleOpenLogsFromSettings}
        uiScale={uiScale}
      />
    </SafeAreaView>
  );
}