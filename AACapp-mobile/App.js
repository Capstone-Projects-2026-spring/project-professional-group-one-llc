import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, View, Text, useWindowDimensions } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Contexts
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import LoginScreen from "./src/components/LoginScreen";
import RegisterScreen from "./src/components/RegisterScreen";

// Hooks
import useLocationDetection from "./src/hooks/useLocationDetection";
import useSentenceBuilder from "./src/hooks/useSentenceBuilder";
import useInteractionLogger from "./src/hooks/useInteractionLogger";
import useBeaconScanner from "./src/hooks/useBeaconScanner";

// Components
import RoomSelector from "./src/components/RoomSelector";
import AppHeader from "./src/components/AppHeader";
import InteractionLogModal from "./src/components/InteractionLogModal";
import SentenceBar from "./src/components/SentenceBar";
import WordGrid from "./src/components/WordGrid";
import CategoryTabs from "./src/components/CategoryTabs";
import BeaconScannerPanel from "./src/components/BeaconScannerPanel";

// Data & Constants
import { getRoomByBeaconDevice } from "./src/data/roomContexts";
import {
  DEFAULT_SUGGESTIONS,
  CATEGORIES,
  CATEGORY_COLORS,
} from "./src/constants/aacVocabulary";
import styles from "./src/styles/appStyles";

const BEACON_SCAN_TAB = "Beacon Scan";
const Stack = createNativeStackNavigator();

// --- Main Application Content (The Authenticated UI) ---

function MainContent({ navigation }) {
  const [activeCategory, setActiveCategory] = useState("Suggested");
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const [isAutoBeaconEnabled, setIsAutoBeaconEnabled] = useState(false);
  const [roomSwitchNotice, setRoomSwitchNotice] = useState("");
  const roomNoticeTimerRef = useRef(null);

  const { width, height } = useWindowDimensions();
  const { currentRoom, allRooms, setRoomManually } = useLocationDetection();
  const { interactionLogs, logButtonPress } = useInteractionLogger(currentRoom);
  const { signOut, profile } = useAuth();

  const {
    isScanning: isBeaconScanning,
    error: beaconScanError,
    devices: scannedBeaconDevices,
    startScan: startBeaconScan,
    stopScan: stopBeaconScan,
  } = useBeaconScanner();

  // Dynamic UI Scaling
  const smallestSide = Math.min(width, height);
  const uiScale = Math.max(0.85, Math.min(1.35, smallestSide / 390));

  // --- Beacon Logic ---

  useEffect(() => {
    if (!isAutoBeaconEnabled) return;

    const bestMatch = scannedBeaconDevices
      .slice()
      .sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999))
      .find((device) => getRoomByBeaconDevice(device));

    if (!bestMatch) return;

    const matchedRoom = getRoomByBeaconDevice(bestMatch);
    if (!matchedRoom || currentRoom?.id === matchedRoom.id) return;

    // Trigger Room Switch
    setRoomManually(matchedRoom.id);
    setRoomSwitchNotice(
      `Switched to ${matchedRoom.emoji || ""} ${matchedRoom.label}`.trim()
    );

    if (roomNoticeTimerRef.current) clearTimeout(roomNoticeTimerRef.current);
    roomNoticeTimerRef.current = setTimeout(
      () => setRoomSwitchNotice(""),
      2200
    );

    logButtonPress("beacon_room_detected", {
      detectedRoomId: matchedRoom.id,
      beaconRssi: bestMatch.rssi,
    });
  }, [isAutoBeaconEnabled, scannedBeaconDevices, currentRoom?.id]);

  // --- Handlers ---

  const handleLogout = useCallback(async () => {
    await signOut();
    navigation.replace("Login");
  }, [signOut, navigation]);

  const handleSelectRoom = useCallback(
    (roomId) => {
      setRoomManually(roomId);
      const roomLabel =
        allRooms.find((r) => r.id === roomId)?.label ?? "General";
      logButtonPress("room_selector", {
        selectedRoomId: roomId || "general",
        selectedRoomLabel: roomLabel,
      });
    },
    [allRooms, logButtonPress, setRoomManually]
  );

  const handleToggleAutoBeacon = useCallback(() => {
    setIsAutoBeaconEnabled((prev) => {
      const next = !prev;
      next ? startBeaconScan() : stopBeaconScan();
      logButtonPress("auto_beacon_toggle", { enabled: next });
      return next;
    });
  }, [logButtonPress, startBeaconScan, stopBeaconScan]);

  const { sentence, addWord, removeLastWord, clearSentence, speakSentence } =
    useSentenceBuilder({ onLogPress: logButtonPress });

  // --- Memos & Styling ---

  const categories = useMemo(() => {
    const suggested = currentRoom
      ? currentRoom.suggestions
      : DEFAULT_SUGGESTIONS;
    return { Suggested: suggested, ...CATEGORIES, [BEACON_SCAN_TAB]: [] };
  }, [currentRoom]);

  const categoryColors = useMemo(
    () => ({
      ...CATEGORY_COLORS,
      Suggested: currentRoom ? currentRoom.color : "#6C63FF",
      [BEACON_SCAN_TAB]: "#1a1a2e",
    }),
    [currentRoom]
  );

  const activeCategoryColor = categoryColors[activeCategory] || "#6C63FF";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <AppHeader
        currentRoom={currentRoom}
        onViewLogs={() => setIsLogsVisible(true)}
        isAutoBeaconEnabled={isAutoBeaconEnabled}
        onToggleAutoBeacon={handleToggleAutoBeacon}
        onLogout={handleLogout}
        userRole={profile?.role}
        uiScale={uiScale}
      />

      {!!roomSwitchNotice && (
        <View style={styles.roomSwitchNoticeWrap}>
          <View style={styles.roomSwitchNoticePill}>
            <Text style={styles.roomSwitchNoticeText}>{roomSwitchNotice}</Text>
          </View>
        </View>
      )}

      <SentenceBar
        sentence={sentence}
        onRemoveLastWord={removeLastWord}
        onClearSentence={clearSentence}
        onSpeakSentence={speakSentence}
        uiScale={uiScale}
      />

      <View style={{ flex: 1, flexDirection: "row" }}>
        {activeCategory === BEACON_SCAN_TAB ? (
          <BeaconScannerPanel
            isScanning={isBeaconScanning}
            error={beaconScanError}
            devices={scannedBeaconDevices}
            onStartScan={startBeaconScan}
            onStopScan={stopBeaconScan}
          />
        ) : (
          <WordGrid
            words={categories[activeCategory] || []}
            activeCategoryColor={activeCategoryColor}
            onAddWord={addWord}
            uiScale={uiScale}
          />
        )}

        <RoomSelector
          rooms={allRooms}
          activeRoomId={currentRoom?.id ?? null}
          onSelectRoom={handleSelectRoom}
          uiScale={uiScale}
        />
      </View>

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        categoryColors={categoryColors}
        onSelectCategory={setActiveCategory}
        uiScale={uiScale}
      />

      <InteractionLogModal
        visible={isLogsVisible}
        logs={interactionLogs}
        onClose={() => setIsLogsVisible(false)}
      />
    </SafeAreaView>
  );
}

// --- Navigation Wrapper ---

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainContent} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            {/* Fallback for development skip button */}
            <Stack.Screen name="Main" component={MainContent} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
