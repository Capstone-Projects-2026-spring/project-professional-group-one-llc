import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, ScrollView, Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import styles from '../styles/appStyles';
import { usePictogram } from '../hooks/usePictogram';

/**
 * PictogramTile
 * -------------
 * Fetches and renders the ARASAAC pictogram for a single word label.
 * Shows a spinner while loading; falls back to the word's initial letter on error.
 */
function PictogramTile({ label, arasaacId, color, onPress, uiScale, tileSize }) {
  // arasaacId (optional): when set, bypasses the API search entirely
  const { uri, loading, error } = usePictogram(label, arasaacId);
  const pictogramSize = Math.round(Math.max(44, Math.min(84, 60 * uiScale)));
  const tilePadding = Math.round(1 * uiScale);
  const labelFontSize = Math.round(13 * uiScale);
  const tileHeight = pictogramSize + Math.round(28 * uiScale);

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        { backgroundColor: `${color}22`, borderColor: color },
        {
          width: tileSize,
          height: tileHeight,
          aspectRatio: undefined,
          borderRadius: Math.round(16 * uiScale),
          borderWidth: Math.max(1.5, 2 * uiScale),
          padding: tilePadding,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[picStyles.imageWrapper, { width: pictogramSize, height: pictogramSize }]}>
        {loading && (
          <ActivityIndicator size="small" color={color} />
        )}

        {!loading && uri && (
          <Image
            source={{ uri }}
            style={{ width: pictogramSize, height: pictogramSize }}
            resizeMode="contain"
            accessibilityLabel={label}
          />
        )}

        {!loading && (error || !uri) && (
          /* Graceful fallback: first letter of the word */
          <View
            style={[
              picStyles.fallback,
              {
                width: pictogramSize,
                height: pictogramSize,
                borderRadius: Math.round(8 * uiScale),
                borderColor: color,
              },
            ]}
          >
            <Text style={[picStyles.fallbackText, { color, fontSize: Math.round(26 * uiScale) }]}>
              {label.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text
        numberOfLines={1}
        style={[styles.tileLabel, { fontSize: labelFontSize }]}
      >
        {label}
      </Text>
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

export default function WordGrid({
  words,
  activeCategoryColor,
  onAddWord,
  uiScale = 1,
  onScrollMetricsChange,
}) {
  const [gridWidth, setGridWidth] = useState(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const columns = 6;
  const horizontalPaddingLeft = Math.round(12 * uiScale);
  const horizontalPaddingRight = Math.round(4 * uiScale);
  const gap = Math.round(10 * uiScale);

  const emitScrollMetrics = useCallback((offsetY) => {
    if (!onScrollMetricsChange) return;

    onScrollMetricsChange({
      offsetY,
      contentHeight: contentHeightRef.current,
      viewportHeight: viewportHeightRef.current,
    });
  }, [onScrollMetricsChange]);

  const tileSize = useMemo(() => {
    if (!gridWidth) return undefined;
    const available = gridWidth - horizontalPaddingLeft - horizontalPaddingRight - (gap * (columns - 1));
    return Math.max(88, Math.floor(available / columns));
  }, [columns, gap, gridWidth, horizontalPaddingLeft, horizontalPaddingRight]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onLayout={(event) => {
        const nextWidth = Math.floor(event.nativeEvent.layout.width);
        viewportHeightRef.current = event.nativeEvent.layout.height;
        if (nextWidth !== gridWidth) {
          setGridWidth(nextWidth);
        }
        emitScrollMetrics(0);
      }}
      onContentSizeChange={(_, height) => {
        contentHeightRef.current = height;
        emitScrollMetrics(0);
      }}
      onScroll={(event) => {
        emitScrollMetrics(event.nativeEvent.contentOffset.y);
      }}
      scrollEventThrottle={16}
      style={[styles.gridScroll, { marginTop: Math.round(12 * uiScale), flex: 1 }]}
      contentContainerStyle={[
        styles.grid,
        {
          paddingLeft: horizontalPaddingLeft,
          paddingRight: horizontalPaddingRight,
          gap,
          paddingBottom: Math.round(12 * uiScale),
          flexGrow: 1,
        },
      ]}
    >
      {words.map((word, index) => (
        <PictogramTile
          key={`${word.label}-${index}`}
          label={word.label}
          arasaacId={word.arasaacId}
          color={activeCategoryColor}
          uiScale={uiScale}
          tileSize={tileSize}
          onPress={() => onAddWord(word.label)}
        />
      ))}
    </ScrollView>
  );
}