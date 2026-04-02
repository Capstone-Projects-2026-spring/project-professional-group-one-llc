import { StatusBar } from "expo-status-bar";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SafeAreaView, Text, View } from "react-native";
import useLocationDetection from "../hooks/useLocationDetection";
import useSentenceBuilder from "../hooks/useSentenceBuilder";
import useInteractionLogger from "../hooks/useInteractionLogger";
import useBeaconScanner from "../hooks/useBeaconScanner";
import RoomSelector from "./RoomSelector";
import AppHeader from "./AppHeader";
import InteractionLogModal from "./InteractionLogModal";
import SentenceBar from "./SentenceBar";
import WordGrid from "./WordGrid";
import CategoryTabs from "./CategoryTabs";
import BeaconScannerPanel from "./BeaconScannerPanel";
import { getRoomByBeaconDevice } from "../data/roomContexts";
import {
  DEFAULT_SUGGESTIONS,
  CATEGORIES,
  CATEGORY_COLORS,
} from "../constants/aacVocabulary";
import styles from "../styles/appStyles";
import { useAuth } from "../contexts/AuthContext";

const BEACON_SCAN_TAB = "Beacon Scan";

export default function MainScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState("Suggested");
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const [isAutoBeaconEnabled, setIsAutoBeaconEnabled] = useState(false);
  const [roomSwitchNotice, setRoomSwitchNotice] = useState("");
  const roomNoticeTimerRef = useRef(null);
  const { currentRoom, allRooms, setRoomManually } = useLocationDetection();
  const { interactionLogs, logButtonPress } = useInteractionLogger(currentRoom);
  const {
    isScanning: isBeaconScanning,
    error: beaconScanError,
    devices: scannedBeaconDevices,
    startScan: startBeaconScan,
    stopScan: stopBeaconScan,
  } = useBeaconScanner();
  const { signOut, profile } = useAuth();

  useEffect(() => {
    if (!isAutoBeaconEnabled) {
      return;
    }

    const bestMatch = scannedBeaconDevices
      .slice()
      .sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999))
      .find((device) => getRoomByBeaconDevice(device));

    if (!bestMatch) {
      return;
    }

    const matchedRoom = getRoomByBeaconDevice(bestMatch);
    if (!matchedRoom) {
      return;
    }

    if (currentRoom?.id !== matchedRoom.id) {
      setRoomManually(matchedRoom.id);
      setRoomSwitchNotice(
        `Switched to ${matchedRoom.emoji || ""} ${matchedRoom.label}`.trim()
      );
      if (roomNoticeTimerRef.current) {
        clearTimeout(roomNoticeTimerRef.current);
      }
      roomNoticeTimerRef.current = setTimeout(() => {
        setRoomSwitchNotice("");
        roomNoticeTimerRef.current = null;
      }, 2200);
      logButtonPress("beacon_room_detected", {
        beaconDeviceId: bestMatch.id,
        beaconDeviceName: bestMatch.name || bestMatch.localName || "unknown",
        beaconRssi: bestMatch.rssi,
        detectedRoomId: matchedRoom.id,
        detectedRoomLabel: matchedRoom.label,
      });
    }
  }, [
    currentRoom?.id,
    isAutoBeaconEnabled,
    logButtonPress,
    scannedBeaconDevices,
    setRoomManually,
  ]);

  useEffect(() => {
    return () => {
      if (roomNoticeTimerRef.current) {
        clearTimeout(roomNoticeTimerRef.current);
      }
    };
  }, []);

  const handleOpenLogs = useCallback(() => {
    logButtonPress("view_logs");
    setIsLogsVisible(true);
  }, [logButtonPress]);

  const handleCloseLogs = useCallback(() => {
    setIsLogsVisible(false);
  }, []);

  const handleSelectRoom = useCallback(
    (roomId) => {
      setRoomManually(roomId);
      const selectedRoom = roomId
        ? allRooms.find((room) => room.id === roomId) ?? null
        : null;
      const roomLabel = selectedRoom?.label ?? "General";
      logButtonPress("room_selector", {
        selectedRoomId: roomId ?? "general",
        selectedRoomLabel: roomLabel,
        location: {
          id: selectedRoom?.id ?? "general",
          label: roomLabel,
        },
      });
    },
    [allRooms, logButtonPress, setRoomManually]
  );

  const handleSelectCategory = useCallback(
    (category) => {
      setActiveCategory(category);
      logButtonPress("category_tab", { category });
    },
    [logButtonPress]
  );

  const handleToggleAutoBeacon = useCallback(() => {
    setIsAutoBeaconEnabled((prev) => {
      const next = !prev;
      if (next) {
        startBeaconScan();
        logButtonPress("auto_beacon_toggle", { enabled: true });
      } else {
        stopBeaconScan();
        logButtonPress("auto_beacon_toggle", { enabled: false });
      }
      return next;
    });
  }, [logButtonPress, startBeaconScan, stopBeaconScan]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigation.replace("Login");
  }, [signOut, navigation]);

  const { sentence, addWord, removeLastWord, clearSentence, speakSentence } =
    useSentenceBuilder({ onLogPress: logButtonPress });

  const categories = useMemo(() => {
    const suggested = currentRoom
      ? currentRoom.suggestions
      : DEFAULT_SUGGESTIONS;
    return { Suggested: suggested, ...CATEGORIES, [BEACON_SCAN_TAB]: [] };
  }, [currentRoom]);

  const suggestedColor = currentRoom ? currentRoom.color : "#6C63FF";
  const words = categories[activeCategory] || [];
  const categoryColors = {
    ...CATEGORY_COLORS,
    Suggested: suggestedColor,
    [BEACON_SCAN_TAB]: "#1a1a2e",
  };
  const activeCategoryColor = categoryColors[activeCategory] || "#6C63FF";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <AppHeader
        currentRoom={currentRoom}
        onViewLogs={handleOpenLogs}
        isAutoBeaconEnabled={isAutoBeaconEnabled}
        onToggleAutoBeacon={handleToggleAutoBeacon}
        onLogout={handleLogout}
        userRole={profile?.role}
      />
      {!!roomSwitchNotice && (
        <View style={styles.roomSwitchNoticeWrap}>
          <View style={styles.roomSwitchNoticePill}>
            <Text style={styles.roomSwitchNoticeText}>{roomSwitchNotice}</Text>
          </View>
        </View>
      )}
      <RoomSelector
        rooms={allRooms}
        activeRoomId={currentRoom?.id ?? null}
        onSelectRoom={handleSelectRoom}
      />
      <SentenceBar
        sentence={sentence}
        onRemoveLastWord={removeLastWord}
        onClearSentence={clearSentence}
        onSpeakSentence={speakSentence}
      />
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
          words={words}
          activeCategoryColor={activeCategoryColor}
          onAddWord={addWord}
        />
      )}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        categoryColors={categoryColors}
        onSelectCategory={handleSelectCategory}
      />
      <InteractionLogModal
        visible={isLogsVisible}
        logs={interactionLogs}
        onClose={handleCloseLogs}
      />
    </SafeAreaView>
  );
}
