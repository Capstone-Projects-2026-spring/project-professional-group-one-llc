import { Text, View } from 'react-native';
import styles from '../styles/appStyles';

export default function AppHeader({ currentRoom }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>AAC Beacon</Text>
      <Text style={styles.headerSubtitle}>
        {currentRoom ? `📍 ${currentRoom.emoji} ${currentRoom.label}` : '📍 General'}
      </Text>
    </View>
  );
}
