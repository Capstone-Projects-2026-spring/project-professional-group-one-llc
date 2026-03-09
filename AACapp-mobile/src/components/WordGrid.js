import { Text, TouchableOpacity, ScrollView, Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import styles from '../styles/appStyles';
import { usePictogram } from '../hooks/usePictogram';

/**
 * PictogramTile
 * -------------
 * Fetches and renders the ARASAAC pictogram for a single word label.
 * Shows a spinner while loading; falls back to the word's initial letter on error.
 */
function PictogramTile({ label, arasaacId, color, onPress }) {
  // arasaacId (optional): when set, bypasses the API search entirely
  const { uri, loading, error } = usePictogram(label, arasaacId);

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        { backgroundColor: `${color}22`, borderColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={picStyles.imageWrapper}>
        {loading && (
          <ActivityIndicator size="small" color={color} />
        )}

        {!loading && uri && (
          <Image
            source={{ uri }}
            style={picStyles.image}
            resizeMode="contain"
            accessibilityLabel={label}
          />
        )}

        {!loading && (error || !uri) && (
          /* Graceful fallback: first letter of the word */
          <View style={[picStyles.fallback, { borderColor: color }]}>
            <Text style={[picStyles.fallbackText, { color }]}>
              {label.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const picStyles = StyleSheet.create({
  imageWrapper: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  image: {
    width: 60,
    height: 60,
  },
  fallback: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 26,
    fontWeight: '700',
  },
});

export default function WordGrid({ words, activeCategoryColor, onAddWord }) {
  return (
    <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid}>
      {words.map((word, index) => (
        <PictogramTile
          key={`${word.label}-${index}`}
          label={word.label}
          arasaacId={word.arasaacId}
          color={activeCategoryColor}
          onPress={() => onAddWord(word.label)}
        />
      ))}
    </ScrollView>
  );
}