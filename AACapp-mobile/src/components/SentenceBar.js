import { ActivityIndicator, Image, Text, View, TouchableOpacity } from 'react-native';
import styles from '../styles/appStyles';
import { usePictogram } from '../hooks/usePictogram';

function ActionPictogramButton({ label, arasaacId, onPress, size }) {
  const { uri, loading } = usePictogram(label, arasaacId);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.actionBtn,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#1a1a2e" />
      ) : uri ? (
        <Image
          source={{ uri }}
          style={{ width: Math.round(size * 0.7), height: Math.round(size * 0.7) }}
          resizeMode="contain"
          accessibilityLabel={label}
        />
      ) : (
        <Text style={[styles.actionBtnText, { fontSize: Math.round(size * 0.42) }]}>{label.charAt(0).toUpperCase()}</Text>
      )}
    </TouchableOpacity>
  );
}

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
      <View style={styles.sentenceContent}>
        {sentence.length === 0 ? null : (
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
      </View>
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
        <ActionPictogramButton
          label="trash can"
          arasaacId={38202}
          onPress={onClearSentence}
          size={Math.round(36 * uiScale)}
        />
        <ActionPictogramButton
          label="speaker"
          arasaacId={26628}
          onPress={onSpeakSentence}
          size={Math.round(36 * uiScale)}
        />
      </View>
    </View>
  );
}
