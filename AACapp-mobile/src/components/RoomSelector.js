import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { usePictogram } from '../hooks/usePictogram';

const GENERAL_ROOM_ARASAAC_ID = 27798;

function RoomPictogram({ label, arasaacId, color, isActive, uiScale }) {
  const { uri, loading, error } = usePictogram(label, arasaacId);
  const iconSize = Math.round(Math.max(30, Math.min(56, 42 * uiScale)));
  const fallbackSize = Math.round(Math.max(30, Math.min(52, 40 * uiScale)));

  if (loading) {
    return <ActivityIndicator size="small" color={isActive ? '#fff' : color} />;
  }

  if (uri && !error) {
    return (
      <Image
        source={{ uri }}
        style={[styles.chipPictogram, { width: iconSize, height: iconSize }]}
        resizeMode="contain"
        accessibilityLabel={label}
      />
    );
  }

  return (
    <View
      style={[
        styles.chipFallback,
        {
          width: fallbackSize,
          height: fallbackSize,
          borderRadius: Math.round(10 * uiScale),
          borderColor: isActive ? '#fff' : color,
        },
      ]}
    >
      <Text
        style={[
          styles.chipFallbackText,
          { color: isActive ? '#fff' : color, fontSize: Math.round(20 * uiScale) },
        ]}
      >
        {label.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * RoomSelector
 * ------------
 * A vertically scrollable rail of room "chips" that lets the user
 * manually simulate entering a room.
 *
 * This component is the placeholder for automatic Bluetooth beacon
 * detection. Once BLE is integrated, this selector can be hidden or
 * shown only as a manual override / fallback.
 *
 * Props
 * -----
 * rooms        : Array<{ id, label, color, arasaacId?: string | number }>
 * activeRoomId : string | null
 * onSelectRoom : (roomId: string | null) => void
 */
export default function RoomSelector({
  rooms,
  activeRoomId,
  onSelectRoom,
  uiScale = 1,
  railWidth = 78,
}) {
  const chipSize = Math.round(Math.max(56, Math.min(96, 72 * uiScale)));

  return (
    <View style={[styles.wrapper, { width: railWidth + 6 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingVertical: Math.round(10 * uiScale) }]}
      >
        {/* "None" chip — clears room context */}
        <TouchableOpacity
          style={[
            styles.chip,
            { width: chipSize, height: chipSize, borderRadius: Math.round(20 * uiScale) },
            !activeRoomId && styles.chipActiveNone,
          ]}
          onPress={() => onSelectRoom(null)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="General room"
        >
          <RoomPictogram
            label="Home"
            arasaacId={GENERAL_ROOM_ARASAAC_ID}
            color="#6C63FF"
            isActive={!activeRoomId}
            uiScale={uiScale}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.chipText,
              !activeRoomId && styles.chipTextActive,
              { fontSize: Math.round(10 * uiScale) },
            ]}
          >
            General
          </Text>
        </TouchableOpacity>

        {rooms.map((room) => {
          const isActive = activeRoomId === room.id;
          return (
            <TouchableOpacity
              key={room.id}
              style={[
                styles.chip,
                { width: chipSize, height: chipSize, borderRadius: Math.round(20 * uiScale) },
                isActive && { backgroundColor: room.color, borderColor: room.color },
              ]}
              onPress={() => onSelectRoom(room.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={room.label}
            >
              <RoomPictogram
                label={room.label}
                arasaacId={room.arasaacId}
                color={room.color}
                isActive={isActive}
                uiScale={uiScale}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[
                  styles.chipText,
                  isActive && styles.chipTextActive,
                  { fontSize: Math.round(10 * uiScale) },
                ]}
              >
                {room.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingRight: 1,
  },
  scroll: {
    alignItems: 'center',
    gap: 10,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  chipActiveNone: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  chipPictogram: {
    width: 42,
    height: 42,
  },
  chipFallback: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipFallbackText: {
    fontSize: 20,
    fontWeight: '700',
  },
  chipText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#444',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  chipTextActive: {
    color: '#fff',
  },
});
