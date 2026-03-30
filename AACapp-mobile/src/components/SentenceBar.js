import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import styles from '../styles/appStyles';

export default function SentenceBar({
  sentence,
  onRemoveLastWord,
  onClearSentence,
  onSpeakSentence,
  uiScale = 1,
}) {
  return (
    <View
      style={[
        styles.sentenceBar,
        {
          marginHorizontal: Math.round(12 * uiScale),
          borderRadius: Math.round(16 * uiScale),
          padding: Math.round(12 * uiScale),
          minHeight: Math.round(70 * uiScale),
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sentenceScroll}
        contentContainerStyle={styles.sentenceContent}
      >
        {sentence.length === 0 ? (
          <Text style={[styles.sentencePlaceholder, { fontSize: Math.round(16 * uiScale) }]}>
            Tap words below to build a sentence...
          </Text>
        ) : (
          sentence.map((word, index) => (
            <View
              key={`${word}-${index}`}
              style={[
                styles.sentenceWord,
                {
                  paddingHorizontal: Math.round(12 * uiScale),
                  paddingVertical: Math.round(6 * uiScale),
                  borderRadius: Math.round(20 * uiScale),
                },
              ]}
            >
              <Text style={[styles.sentenceWordText, { fontSize: Math.round(16 * uiScale) }]}>{word}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <View style={styles.sentenceActions}>
        <TouchableOpacity
          onPress={onRemoveLastWord}
          style={[
            styles.actionBtn,
            {
              width: Math.round(44 * uiScale),
              height: Math.round(36 * uiScale),
              borderRadius: Math.round(10 * uiScale),
            },
          ]}
        >
          <Text style={[styles.actionBtnText, { fontSize: Math.round(18 * uiScale) }]}>⌫</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClearSentence}
          style={[
            styles.actionBtn,
            {
              width: Math.round(44 * uiScale),
              height: Math.round(36 * uiScale),
              borderRadius: Math.round(10 * uiScale),
            },
          ]}
        >
          <Text style={[styles.actionBtnText, { fontSize: Math.round(18 * uiScale) }]}>🗑️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSpeakSentence}
          style={[
            styles.actionBtn,
            styles.speakBtn,
            {
              width: Math.round(60 * uiScale),
              height: Math.round(36 * uiScale),
              borderRadius: Math.round(10 * uiScale),
            },
          ]}
        >
          <Text style={[styles.speakBtnText, { fontSize: Math.round(20 * uiScale) }]}>🔊</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
