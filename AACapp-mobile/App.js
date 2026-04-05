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
import useLocationDetection from "./src/hooks/useLocationDetection";
import useSentenceBuilder from "./src/hooks/useSentenceBuilder";
import useInteractionLogger from "./src/hooks/useInteractionLogger";

// Components
import RoomSelector from "./src/components/RoomSelector";
import AppHeader from "./src/components/AppHeader";
import InteractionLogModal from "./src/components/InteractionLogModal";
import SettingsMenuOverlay from "./src/components/SettingsMenuOverlay"; // Added back
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
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false); // Added state
  const { width, height } = useWindowDimensions();

  const { currentRoom, allRooms, setRoomManually } = useLocationDetection();
  const { interactionLogs, logButtonPress } = useInteractionLogger(currentRoom);
  const { signOut, profile } = useAuth();

  // Dynamic UI Scaling
  const smallestSide = Math.min(width, height);
  const uiScale = Math.max(0.85, Math.min(1.35, smallestSide / 390));

  // --- Handlers ---

  const handleLogout = useCallback(async () => {
    await signOut();
    navigation.replace("Login");
  }, [signOut, navigation]);

  // Open the settings menu
  const handleOpenSettings = useCallback(() => {
    logButtonPress("open_settings");
    setIsSettingsVisible(true);
  }, [logButtonPress]);

  // Close settings and open logs
  const handleViewLogsFromSettings = useCallback(() => {
    setIsSettingsVisible(false);
    setIsLogsVisible(true);
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
        onOpenSettings={handleOpenSettings} // Changed from onViewLogs
        onLogout={handleLogout}
        userRole={profile?.role}
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

      {/* Settings Menu Modal */}
      <SettingsMenuOverlay
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        onViewLogs={handleViewLogsFromSettings}
        uiScale={uiScale}
      />

      {/* Logs Modal */}
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
