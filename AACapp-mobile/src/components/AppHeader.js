import { Pressable, Text, View } from 'react-native';
import styles from '../styles/appStyles';

export default function AppHeader({ onOpenSettings, uiScale = 1 }) {
  return (
    <View
      style={[
        styles.header,
        {
          paddingHorizontal: Math.round(20 * uiScale),
          paddingTop: Math.round(10 * uiScale),
          paddingBottom: Math.round(8 * uiScale),
        },
      ]}
    >
      <View>
        <Text style={[styles.headerTitle, { fontSize: Math.round(22 * uiScale) }]}>AAC Beacon</Text>
      </View>
      <Pressable
        style={[
          styles.settingsIconButton,
          {
            width: Math.round(40 * uiScale),
            height: Math.round(40 * uiScale),
            borderRadius: Math.round(10 * uiScale),
          },
        ]}
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Text style={[styles.settingsIconText, { fontSize: Math.round(20 * uiScale) }]}>{'\u2699'}</Text>
      </Pressable>
    </View>
  );
}
