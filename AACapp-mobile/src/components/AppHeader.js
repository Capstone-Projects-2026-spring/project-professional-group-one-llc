import { Pressable, Text, View } from 'react-native';
import styles from '../styles/appStyles';

export default function AppHeader({ onOpenSettings, uiScale = 1 }) {
  const horizontalPadding = Math.round(Math.min(24, 20 * uiScale));
  const headerTopPadding = Math.round(Math.min(12, 10 * uiScale));
  const headerBottomPadding = Math.round(Math.min(10, 8 * uiScale));
  const titleFontSize = Math.round(Math.min(28, 22 * uiScale));
  const iconButtonSize = Math.round(Math.min(44, 40 * uiScale));
  const iconFontSize = Math.round(Math.min(24, 20 * uiScale));

  return (
    <View
      style={[
        styles.header,
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: headerTopPadding,
          paddingBottom: headerBottomPadding,
        },
      ]}
    >
      <View>
        <Text style={[styles.headerTitle, { fontSize: titleFontSize }]}>AAC Beacon</Text>
      </View>
      <Pressable
        style={[
          styles.settingsIconButton,
          {
            width: iconButtonSize,
            height: iconButtonSize,
            borderRadius: Math.round(10 * uiScale),
          },
        ]}
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Text
          style={[
            styles.settingsIconText,
            {
              fontSize: iconFontSize,
              lineHeight: iconFontSize + 2,
            },
          ]}
        >
          {'\u2699'}
        </Text>
      </Pressable>
    </View>
  );
}