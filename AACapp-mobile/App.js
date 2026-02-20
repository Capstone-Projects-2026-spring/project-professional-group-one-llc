import { StatusBar } from 'expo-status-bar';
import { useState, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native';
import useLocationDetection from './src/hooks/useLocationDetection';
import useSentenceBuilder from './src/hooks/useSentenceBuilder';
import useInteractionLogger from './src/hooks/useInteractionLogger';
import RoomSelector from './src/components/RoomSelector';
import AppHeader from './src/components/AppHeader';
import InteractionLogModal from './src/components/InteractionLogModal';
import SentenceBar from './src/components/SentenceBar';
import WordGrid from './src/components/WordGrid';
import CategoryTabs from './src/components/CategoryTabs';
import {
  DEFAULT_SUGGESTIONS,
  CATEGORIES,
  CATEGORY_COLORS,
} from './src/constants/aacVocabulary';
import styles from './src/styles/appStyles';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('Suggested');
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const { currentRoom, allRooms, setRoomManually } = useLocationDetection();
  const { interactionLogs, logButtonPress } = useInteractionLogger(currentRoom);

  const handleOpenLogs = useCallback(() => {
    logButtonPress('view_logs');
    setIsLogsVisible(true);
  }, [logButtonPress]);

  const handleCloseLogs = useCallback(() => {
    setIsLogsVisible(false);
  }, []);

  const handleSelectRoom = useCallback(
    (roomId) => {
      setRoomManually(roomId);
      const selectedRoom = roomId
        ? (allRooms.find((room) => room.id === roomId) ?? null)
        : null;
      const roomLabel = selectedRoom?.label ?? 'General';
      logButtonPress('room_selector', {
        selectedRoomId: roomId ?? 'general',
        selectedRoomLabel: roomLabel,
        location: {
          id: selectedRoom?.id ?? 'general',
          label: roomLabel,
        },
      });
    },
    [allRooms, logButtonPress, setRoomManually],
  );

  const handleSelectCategory = useCallback(
    (category) => {
      setActiveCategory(category);
      logButtonPress('category_tab', { category });
    },
    [logButtonPress],
  );

  const {
    sentence,
    addWord,
    removeLastWord,
    clearSentence,
    speakSentence,
  } = useSentenceBuilder({ onLogPress: logButtonPress });

  const categories = useMemo(() => {
    const suggested = currentRoom
      ? currentRoom.suggestions
      : DEFAULT_SUGGESTIONS;
    return { Suggested: suggested, ...CATEGORIES };
  }, [currentRoom]);

  const suggestedColor = currentRoom ? currentRoom.color : '#6C63FF';
  const words = categories[activeCategory] || [];
  const categoryColors = {
    ...CATEGORY_COLORS,
    Suggested: suggestedColor,
  };
  const activeCategoryColor = categoryColors[activeCategory] || '#6C63FF';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <AppHeader currentRoom={currentRoom} onViewLogs={handleOpenLogs} />
      <RoomSelector
        rooms={allRooms}
        activeRoomId={currentRoom?.id ?? null}
        onSelectRoom={handleSelectRoom}
      />
      <SentenceBar
        sentence={sentence}
        onRemoveLastWord={removeLastWord}
        onClearSentence={clearSentence}
        onSpeakSentence={speakSentence}
      />
      <WordGrid
        words={words}
        activeCategoryColor={activeCategoryColor}
        onAddWord={addWord}
      />
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        categoryColors={categoryColors}
        onSelectCategory={handleSelectCategory}
      />
      <InteractionLogModal
        visible={isLogsVisible}
        logs={interactionLogs}
        onClose={handleCloseLogs}
      />
    </SafeAreaView>
  );
}
