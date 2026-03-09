import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import styles from '../styles/appStyles';

export default function SentenceBar({
  sentence,
  onRemoveLastWord,
  onClearSentence,
  onSpeakSentence,
}) {
  return (
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
          sentence.map((word, index) => (
            <View key={`${word}-${index}`} style={styles.sentenceWord}>
              <Text style={styles.sentenceWordText}>{word}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <View style={styles.sentenceActions}>
        <TouchableOpacity onPress={onRemoveLastWord} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>⌫</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClearSentence} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>🗑️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSpeakSentence}
          style={[styles.actionBtn, styles.speakBtn]}
        >
          <Text style={styles.speakBtnText}>🔊</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
