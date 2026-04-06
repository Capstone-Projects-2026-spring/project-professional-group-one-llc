import React, { useState, useMemo, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, View, useWindowDimensions } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Contexts
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import LoginScreen from "./src/components/LoginScreen";
import RegisterScreen from "./src/components/RegisterScreen";

// Hooks
import useAdminAnalytics from "./src/hooks/useAdminAnalytics";
import useLocationDetection from "./src/hooks/useLocationDetection";
import useSentenceBuilder from "./src/hooks/useSentenceBuilder";
import useInteractionLogger from "./src/hooks/useInteractionLogger";

// Components
import AdminAccessModal from "./src/components/AdminAccessModal";
import AdminAnalyticsModal from "./src/components/AdminAnalyticsModal";
import RoomSelector from "./src/components/RoomSelector";
import AppHeader from "./src/components/AppHeader";
import SettingsMenuOverlay from "./src/components/SettingsMenuOverlay";
import InteractionLogModal from "./src/components/InteractionLogModal";
import SentenceBar from "./src/components/SentenceBar";
import WordGrid from "./src/components/WordGrid";
import { getFitzgeraldColorForWord } from "./src/utils/fitzgeraldKey";

// Constants & Styles
import { DEFAULT_SUGGESTIONS, CORE_WORDS } from "./src/constants/aacVocabulary";
import styles from "./src/styles/appStyles";

const Stack = createNativeStackNavigator();

// --- Utility Functions ---

function mergeUniqueWords(primaryWords, secondaryWords) {
  const seen = new Set();
  const merged = [];
  for (const word of [...primaryWords, ...secondaryWords]) {
    const key = word.label.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(word);
  }
  return merged;
}

// --- Main Application Content ---

function MainContent({ navigation }) {
  const [adminAccessCode, setAdminAccessCode] = useState("");
  const [isAdminAccessVisible, setIsAdminAccessVisible] = useState(false);
  const [isAdminAnalyticsVisible, setIsAdminAnalyticsVisible] = useState(false);
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const { signOut, profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { currentRoom, allRooms, setRoomManually } = useLocationDetection();
  const {
    analytics,
    clearAdminSession,
    errorMessage: adminAnalyticsError,
    isLoading: isAdminAnalyticsLoading,
    loadAnalytics,
    refreshAnalytics,
  } = useAdminAnalytics();
  const { interactionLogs, logButtonPress } = useInteractionLogger(currentRoom);

  // Dynamic UI Scaling
  const smallestSide = Math.min(width, height);
  const uiScale = Math.max(0.85, Math.min(1.35, smallestSide / 390));

  // --- Handlers ---

  const handleLogout = useCallback(async () => {
    await signOut();
    navigation.replace("Login");
  }, [signOut, navigation]);

  const handleOpenSettings = useCallback(() => {
    logButtonPress("open_settings");
    setIsSettingsVisible(true);
  }, [logButtonPress]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsVisible(false);
  }, []);

  const handleOpenAdminAnalytics = useCallback(() => {
    setIsSettingsVisible(false);
    setIsAdminAccessVisible(true);
  }, []);

  const handleCloseAdminAccess = useCallback(() => {
    clearAdminSession();
    setIsAdminAccessVisible(false);
    setAdminAccessCode("");
  }, [clearAdminSession]);

  const handleAdminAccessCodeChange = useCallback((value) => {
    setAdminAccessCode(value);
  }, []);

  const handleSubmitAdminAccess = useCallback(async () => {
    const didUnlock = await loadAnalytics(adminAccessCode);

    if (!didUnlock) {
      return;
    }

    logButtonPress("open_admin_analytics");
    setIsAdminAccessVisible(false);
    setIsAdminAnalyticsVisible(true);
    setAdminAccessCode("");
  }, [adminAccessCode, loadAnalytics, logButtonPress]);

  const handleCloseAdminAnalytics = useCallback(() => {
    clearAdminSession();
    setIsAdminAnalyticsVisible(false);
    setAdminAccessCode("");
  }, [clearAdminSession]);

  const handleOpenLogsFromSettings = useCallback(() => {
    setIsSettingsVisible(false);
    setIsLogsVisible(true);
  }, []);

  const handleCloseLogs = useCallback(() => {
    setIsLogsVisible(false);
  }, []);

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

  const { sentence, addWord, removeLastWord, clearSentence, speakSentence } =
    useSentenceBuilder({ onLogPress: logButtonPress });

  // --- Memos ---

  const words = useMemo(() => {
    const roomWords = currentRoom
      ? currentRoom.suggestions
      : DEFAULT_SUGGESTIONS;
    return mergeUniqueWords(CORE_WORDS, roomWords);
  }, [currentRoom]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <AppHeader
        currentRoom={currentRoom}
        onOpenSettings={handleOpenSettings}
        onLogout={handleLogout}
        userRole={profile?.role}
        showSettings={isAdmin}
        uiScale={uiScale}
      />

      <SentenceBar
        sentence={sentence}
        onRemoveLastWord={removeLastWord}
        onClearSentence={clearSentence}
        onSpeakSentence={speakSentence}
        uiScale={uiScale}
      />

      <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
        <WordGrid
          words={words}
          getWordColor={getFitzgeraldColorForWord}
          onAddWord={addWord}
          uiScale={uiScale}
        />

        <RoomSelector
          rooms={allRooms}
          activeRoomId={currentRoom?.id ?? null}
          onSelectRoom={handleSelectRoom}
          uiScale={uiScale}
        />
      </View>

      <SettingsMenuOverlay
        visible={isSettingsVisible}
        onClose={handleCloseSettings}
        onOpenAdminAnalytics={handleOpenAdminAnalytics}
        onViewLogs={handleOpenLogsFromSettings}
        uiScale={uiScale}
      />

      <InteractionLogModal
        visible={isLogsVisible}
        logs={interactionLogs}
        onClose={handleCloseLogs}
      />

      <AdminAnalyticsModal
        visible={isAdminAnalyticsVisible}
        analytics={analytics}
        errorMessage={adminAnalyticsError}
        isLoading={isAdminAnalyticsLoading}
        onRefresh={() => {
          void refreshAnalytics();
        }}
        onClose={handleCloseAdminAnalytics}
      />

      <AdminAccessModal
        visible={isAdminAccessVisible}
        accessCode={adminAccessCode}
        errorMessage={adminAnalyticsError}
        isSubmitting={isAdminAnalyticsLoading}
        onChangeAccessCode={handleAdminAccessCodeChange}
        onClose={handleCloseAdminAccess}
        onSubmit={handleSubmitAdminAccess}
        uiScale={uiScale}
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