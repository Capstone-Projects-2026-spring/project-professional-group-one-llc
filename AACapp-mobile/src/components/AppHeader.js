import { Pressable, Text, View } from 'react-native';
import styles from '../styles/appStyles';

export default function AppHeader({ currentRoom, onViewLogs, isAutoBeaconEnabled, onToggleAutoBeacon }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>AAC Beacon</Text>
        <Text style={styles.headerSubtitle}>
          {currentRoom ? `📍 ${currentRoom.emoji} ${currentRoom.label}` : '📍 General'}
        </Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          style={[
            styles.autoBeaconButton,
            isAutoBeaconEnabled && styles.autoBeaconButtonEnabled,
          ]}
          onPress={onToggleAutoBeacon}
        >
          <Text
            style={[
              styles.autoBeaconButtonText,
              isAutoBeaconEnabled && styles.autoBeaconButtonTextEnabled,
            ]}
          >
            {isAutoBeaconEnabled ? 'Auto Beacon: ON' : 'Auto Beacon: OFF'}
          </Text>
        </Pressable>
        <Pressable style={styles.viewLogsButton} onPress={onViewLogs}>
          <Text style={styles.viewLogsButtonText}>View Logs</Text>
        </Pressable>
      </View>
    </View>
  );
}
