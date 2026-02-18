import { StatusBar } from 'expo-status-bar';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native';
import useLocationDetection from './src/hooks/useLocationDetection';
import useSentenceBuilder from './src/hooks/useSentenceBuilder';
import RoomSelector from './src/components/RoomSelector';
import AppHeader from './src/components/AppHeader';
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
  const {
    sentence,
    addWord,
    removeLastWord,
    clearSentence,
    speakSentence,
  } = useSentenceBuilder();

  const { currentRoom, allRooms, setRoomManually } = useLocationDetection();

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
      <AppHeader currentRoom={currentRoom} />
      <RoomSelector
        rooms={allRooms}
        activeRoomId={currentRoom?.id ?? null}
        onSelectRoom={setRoomManually}
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
        onSelectCategory={setActiveCategory}
      />
    </SafeAreaView>
  );
}
