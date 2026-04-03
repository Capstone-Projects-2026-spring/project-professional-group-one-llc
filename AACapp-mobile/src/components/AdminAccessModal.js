import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import styles from '../styles/appStyles';

export default function AdminAccessModal({
  visible,
  accessCode,
  errorMessage,
  isSubmitting,
  onChangeAccessCode,
  onClose,
  onSubmit,
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
            styles.adminAccessOverlay,
            {
              paddingHorizontal: Math.round(20 * uiScale),
              paddingTop: Math.round(18 * uiScale),
              paddingBottom: Math.round(18 * uiScale),
              borderRadius: Math.round(18 * uiScale),
            },
          ]}
        >
          <Text style={[styles.settingsMenuTitle, { fontSize: Math.round(22 * uiScale) }]}>
            Admin Access
          </Text>
          <Text style={[styles.adminAccessDescription, { fontSize: Math.round(14 * uiScale) }]}>
            Enter the shared admin access code to load Supabase analytics.
          </Text>
          <TextInput
            value={accessCode}
            onChangeText={onChangeAccessCode}
            placeholder="Admin access code"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            style={[
              styles.adminAccessInput,
              {
                fontSize: Math.round(15 * uiScale),
                borderRadius: Math.round(12 * uiScale),
                paddingHorizontal: Math.round(14 * uiScale),
                paddingVertical: Math.round(12 * uiScale),
              },
            ]}
            accessibilityLabel="Admin access code"
          />
          {errorMessage ? (
            <Text style={[styles.adminAccessErrorText, { fontSize: Math.round(12 * uiScale) }]}>
              {errorMessage}
            </Text>
          ) : null}
          <View style={styles.adminAccessActions}>
            <Pressable
              style={[styles.logsCloseButton, styles.adminAccessButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.logsCloseButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.logsExportButton, styles.adminAccessButton]}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.logsExportButtonText}>
                {isSubmitting ? 'Checking...' : 'Unlock'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
