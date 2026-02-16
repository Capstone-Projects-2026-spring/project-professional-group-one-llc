import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

/**
 * RoomSelector
 * ------------
 * A horizontally scrollable row of room "chips" that lets the user
 * manually simulate entering a room.
 *
 * This component is the placeholder for automatic Bluetooth beacon
 * detection. Once BLE is integrated, this selector can be hidden or
 * shown only as a manual override / fallback.
 *
 * Props
 * -----
 * rooms        : Array<{ id, label, emoji, color }>
 * activeRoomId : string | null
 * onSelectRoom : (roomId: string | null) => void
 */
export default function RoomSelector({ rooms, activeRoomId, onSelectRoom }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.labelIcon}>📍</Text>
        <Text style={styles.label}>Simulate Room</Text>
        <Text style={styles.sublabel}>(BLE placeholder)</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* "None" chip — clears room context */}
        <TouchableOpacity
          style={[
            styles.chip,
            !activeRoomId && styles.chipActiveNone,
          ]}
          onPress={() => onSelectRoom(null)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipEmoji}>🌐</Text>
          <Text
            style={[styles.chipText, !activeRoomId && styles.chipTextActive]}
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
                isActive && { backgroundColor: room.color, borderColor: room.color },
              ]}
              onPress={() => onSelectRoom(room.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipEmoji}>{room.emoji}</Text>
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
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
    paddingTop: 4,
    paddingBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 4,
  },
  labelIcon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  sublabel: {
    fontSize: 11,
    color: '#aaa',
    fontStyle: 'italic',
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ddd',
    gap: 6,
  },
  chipActiveNone: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  chipTextActive: {
    color: '#fff',
  },
});
