import { Pressable, Text, View } from 'react-native';
import styles from '../styles/appStyles';

export default function AppHeader({ currentRoom, onViewLogs }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>AAC Beacon</Text>
        <Text style={styles.headerSubtitle}>
          {currentRoom ? `📍 ${currentRoom.emoji} ${currentRoom.label}` : '📍 General'}
        </Text>
      </View>
      <Pressable style={styles.viewLogsButton} onPress={onViewLogs}>
        <Text style={styles.viewLogsButtonText}>View Logs</Text>
      </Pressable>
    </View>
  );
}
