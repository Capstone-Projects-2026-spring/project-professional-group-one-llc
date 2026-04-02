import { Pressable, Text, View } from 'react-native';
import styles from '../styles/appStyles';

export default function AppHeader({ currentRoom, onViewLogs, isAutoBeaconEnabled, onToggleAutoBeacon, onLogout, userRole }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>AAC Beacon</Text>
        <Text style={styles.headerSubtitle}>
          {currentRoom ? `📍 ${currentRoom.emoji} ${currentRoom.label}` : '📍 General'}
        </Text>
        {userRole && (
          <Text style={styles.headerRole}>
            Role: {userRole === 'admin' ? 'Admin' : 'User'}
          </Text>
        )}
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
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}
