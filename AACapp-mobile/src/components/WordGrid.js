import { Text, TouchableOpacity, ScrollView } from 'react-native';
import styles from '../styles/appStyles';

export default function WordGrid({ words, activeCategoryColor, onAddWord }) {
  return (
    <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid}>
      {words.map((word, index) => (
        <TouchableOpacity
          key={`${word.label}-${index}`}
          style={[
            styles.tile,
            { backgroundColor: `${activeCategoryColor}22` },
            { borderColor: activeCategoryColor },
          ]}
          onPress={() => onAddWord(word.label)}
          activeOpacity={0.6}
        >
          <Text style={styles.tileEmoji}>{word.emoji}</Text>
          <Text style={styles.tileLabel}>{word.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
