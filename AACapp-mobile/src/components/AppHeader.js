import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import styles from "../styles/appStyles";
import { usePictogram } from "../hooks/usePictogram";

function SettingsPictogram({ size }) {
  const { uri, loading } = usePictogram("configuration button", 39466);

  if (loading) {
    return <ActivityIndicator size="small" color="#1a1a2e" />;
  }

  if (!uri) {
    return null;
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width: Math.round(size * 0.62),
        height: Math.round(size * 0.62),
      }}
      resizeMode="contain"
      accessibilityLabel="Open settings"
    />
  );
}

export default function AppHeader({
  // Settings (new)
  onOpenSettings,
  showSettings = false,
  uiScale = 1,
  // Room / beacon / auth (existing)
  currentRoom,
  onViewLogs,
  isAutoBeaconEnabled,
  onToggleAutoBeacon,
  onLogout,
  userRole,
}) {
  const horizontalPadding = Math.round(Math.min(24, 20 * uiScale));
  const headerTopPadding = Math.round(Math.min(12, 10 * uiScale));
  const headerBottomPadding = Math.round(Math.min(10, 8 * uiScale));
  const iconButtonSize = Math.round(Math.min(44, 40 * uiScale));
  const logoutButtonWidth = Math.round(Math.min(102, 94 * uiScale));
  const logoutButtonHeight = Math.round(Math.min(40, 36 * uiScale));

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
      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: Math.round(8 * uiScale) }}>
        {showSettings ? (
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
            <SettingsPictogram size={iconButtonSize} />
          </Pressable>
        ) : null}

        <Pressable
          style={[
            styles.viewLogsButton,
            {
              width: logoutButtonWidth,
              height: logoutButtonHeight,
              borderRadius: Math.round(10 * uiScale),
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Text style={styles.viewLogsButtonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}
