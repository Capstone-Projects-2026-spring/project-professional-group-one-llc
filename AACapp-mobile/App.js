import { StatusBar } from 'expo-status-bar';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import useLocationDetection from './src/hooks/useLocationDetection';
import useSentenceBuilder from './src/hooks/useSentenceBuilder';
import useInteractionLogger from './src/hooks/useInteractionLogger';
import useBeaconScanner from './src/hooks/useBeaconScanner';
import RoomSelector from './src/components/RoomSelector';
import AppHeader from './src/components/AppHeader';
import InteractionLogModal from './src/components/InteractionLogModal';
import SentenceBar from './src/components/SentenceBar';
import WordGrid from './src/components/WordGrid';
import CategoryTabs from './src/components/CategoryTabs';
import BeaconScannerPanel from './src/components/BeaconScannerPanel';
import { getRoomByBeaconDevice } from './src/data/roomContexts';
import {
  DEFAULT_SUGGESTIONS,
  CATEGORIES,
  CATEGORY_COLORS,
} from './src/constants/aacVocabulary';
import styles from './src/styles/appStyles';

const BEACON_SCAN_TAB = 'Beacon Scan';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('Suggested');
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const [isAutoBeaconEnabled, setIsAutoBeaconEnabled] = useState(false);
  const [roomSwitchNotice, setRoomSwitchNotice] = useState('');
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
      setRoomSwitchNotice(`Switched to ${matchedRoom.emoji || ''} ${matchedRoom.label}`.trim());
      if (roomNoticeTimerRef.current) {
        clearTimeout(roomNoticeTimerRef.current);
      }
      roomNoticeTimerRef.current = setTimeout(() => {
        setRoomSwitchNotice('');
        roomNoticeTimerRef.current = null;
      }, 2200);
      logButtonPress('beacon_room_detected', {
        beaconDeviceId: bestMatch.id,
        beaconDeviceName: bestMatch.name || bestMatch.localName || 'unknown',
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
    logButtonPress('view_logs');
    setIsLogsVisible(true);
  }, [logButtonPress]);

  const handleCloseLogs = useCallback(() => {
    setIsLogsVisible(false);
  }, []);

  const handleSelectRoom = useCallback(
    (roomId) => {
      setRoomManually(roomId);
      const selectedRoom = roomId
        ? (allRooms.find((room) => room.id === roomId) ?? null)
        : null;
      const roomLabel = selectedRoom?.label ?? 'General';
      logButtonPress('room_selector', {
        selectedRoomId: roomId ?? 'general',
        selectedRoomLabel: roomLabel,
        location: {
          id: selectedRoom?.id ?? 'general',
          label: roomLabel,
        },
      });
    },
    [allRooms, logButtonPress, setRoomManually],
  );

  const handleSelectCategory = useCallback(
    (category) => {
      setActiveCategory(category);
      logButtonPress('category_tab', { category });
    },
    [logButtonPress],
  );

  const handleToggleAutoBeacon = useCallback(() => {
    setIsAutoBeaconEnabled((prev) => {
      const next = !prev;
      if (next) {
        startBeaconScan();
        logButtonPress('auto_beacon_toggle', { enabled: true });
      } else {
        stopBeaconScan();
        logButtonPress('auto_beacon_toggle', { enabled: false });
      }
      return next;
    });
  }, [logButtonPress, startBeaconScan, stopBeaconScan]);

  const {
    sentence,
    addWord,
    removeLastWord,
    clearSentence,
    speakSentence,
  } = useSentenceBuilder({ onLogPress: logButtonPress });

  const categories = useMemo(() => {
    const suggested = currentRoom
      ? currentRoom.suggestions
      : DEFAULT_SUGGESTIONS;
    return { Suggested: suggested, ...CATEGORIES, [BEACON_SCAN_TAB]: [] };
  }, [currentRoom]);

  const suggestedColor = currentRoom ? currentRoom.color : '#6C63FF';
  const words = categories[activeCategory] || [];
  const categoryColors = {
    ...CATEGORY_COLORS,
    Suggested: suggestedColor,
    [BEACON_SCAN_TAB]: '#1a1a2e',
  };
  const activeCategoryColor = categoryColors[activeCategory] || '#6C63FF';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <AppHeader
        currentRoom={currentRoom}
        onViewLogs={handleOpenLogs}
        isAutoBeaconEnabled={isAutoBeaconEnabled}
        onToggleAutoBeacon={handleToggleAutoBeacon}
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
