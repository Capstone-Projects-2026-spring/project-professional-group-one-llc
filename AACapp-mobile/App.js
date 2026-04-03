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
import SentenceBar from "./src/components/SentenceBar";
import WordGrid from "./src/components/WordGrid";

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

// --- Main Application Content (The Authenticated UI) ---

function MainContent({ navigation }) {
  const [isLogsVisible, setIsLogsVisible] = useState(false);
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

  // Combines "Core" words with words suggested by the current room
  const words = useMemo(() => {
    const roomWords = currentRoom
      ? currentRoom.suggestions
      : DEFAULT_SUGGESTIONS;
    return mergeUniqueWords(CORE_WORDS, roomWords);
  }, [currentRoom]);

  const activeCategoryColor = currentRoom ? currentRoom.color : "#6C63FF";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <AppHeader
        currentRoom={currentRoom}
        onViewLogs={() => setIsLogsVisible(true)}
        onLogout={handleLogout}
        userRole={profile?.role}
        uiScale={uiScale}
        // Removed beacon-related props
      />

      <SentenceBar
        sentence={sentence}
        onRemoveLastWord={removeLastWord}
        onClearSentence={clearSentence}
        onSpeakSentence={speakSentence}
        uiScale={uiScale}
      />

      <View style={{ flex: 1, flexDirection: "row" }}>
        <WordGrid
          words={words}
          activeCategoryColor={activeCategoryColor}
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
            {/* Dev skip fallback */}
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
