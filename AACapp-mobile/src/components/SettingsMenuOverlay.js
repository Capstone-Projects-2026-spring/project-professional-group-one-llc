import { Modal, Pressable, Text, View } from 'react-native';
import styles from '../styles/appStyles';

export default function SettingsMenuOverlay({
  visible,
  onClose,
  onOpenAdminAnalytics,
  onViewLogs,
  uiScale = 1,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.settingsBackdrop}>
        <View
          style={[
            styles.settingsOverlay,
            {
              paddingHorizontal: Math.round(20 * uiScale),
              paddingTop: Math.round(14 * uiScale),
              paddingBottom: Math.round(18 * uiScale),
              borderRadius: Math.round(18 * uiScale),
            },
          ]}
        >
          <View style={styles.settingsHeaderRow}>
            <Text style={[styles.settingsMenuTitle, { fontSize: Math.round(22 * uiScale) }]}>Settings</Text>
            <Pressable
              style={[
                styles.settingsCloseButton,
                {
                  width: Math.round(38 * uiScale),
                  height: Math.round(38 * uiScale),
                },
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close settings"
            >
              <Text style={[styles.settingsCloseButtonText, { fontSize: Math.round(16 * uiScale) }]}>X</Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.settingsMenuOption,
              {
                borderRadius: Math.round(12 * uiScale),
                paddingHorizontal: Math.round(14 * uiScale),
                paddingVertical: Math.round(12 * uiScale),
              },
            ]}
            onPress={onViewLogs}
            accessibilityRole="button"
            accessibilityLabel="View interaction logs"
          >
            <Text style={[styles.settingsMenuOptionText, { fontSize: Math.round(16 * uiScale) }]}>View Logs</Text>
          </Pressable>

          <Pressable
            style={[
              styles.settingsMenuOption,
              styles.settingsMenuOptionSpaced,
              {
                borderRadius: Math.round(12 * uiScale),
                paddingHorizontal: Math.round(14 * uiScale),
                paddingVertical: Math.round(12 * uiScale),
              },
            ]}
            onPress={onOpenAdminAnalytics}
            accessibilityRole="button"
            accessibilityLabel="Open admin analytics"
          >
            <Text style={[styles.settingsMenuOptionText, { fontSize: Math.round(16 * uiScale) }]}>
              Admin Analytics
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
