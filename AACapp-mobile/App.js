import { StatusBar } from 'expo-status-bar';
import { useState, useMemo, useCallback } from 'react';
import { SafeAreaView, View, useWindowDimensions } from 'react-native';
import useAdminAnalytics from './src/hooks/useAdminAnalytics';
import useLocationDetection from './src/hooks/useLocationDetection';
import useSentenceBuilder from './src/hooks/useSentenceBuilder';
import useInteractionLogger from './src/hooks/useInteractionLogger';
import AdminAccessModal from './src/components/AdminAccessModal';
import AdminAnalyticsModal from './src/components/AdminAnalyticsModal';
import RoomSelector from './src/components/RoomSelector';
import AppHeader from './src/components/AppHeader';
import SettingsMenuOverlay from './src/components/SettingsMenuOverlay';
import InteractionLogModal from './src/components/InteractionLogModal';
import SentenceBar from './src/components/SentenceBar';
import WordGrid from './src/components/WordGrid';
import { DEFAULT_SUGGESTIONS, CORE_WORDS } from './src/constants/aacVocabulary';
import styles from './src/styles/appStyles';

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

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '').trim();
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  if (full.length !== 6) {
    return `rgba(46, 204, 113, ${alpha})`;
  }

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function App() {
  const [adminAccessCode, setAdminAccessCode] = useState('');
  const [isAdminAccessVisible, setIsAdminAccessVisible] = useState(false);
  const [isAdminAnalyticsVisible, setIsAdminAnalyticsVisible] = useState(false);
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [gridScroll, setGridScroll] = useState({
    progress: 0,
    thumbRatio: 1,
    scrollable: false,
  });
  const { width, height } = useWindowDimensions();
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

  const smallestSide = Math.min(width, height);
  const uiScale = Math.max(0.85, Math.min(1.35, smallestSide / 390));
  const isTablet = smallestSide >= 768;
  const roomRailWidth = Math.round((isTablet ? 102 : 78) * uiScale);
  const indicatorWidth = Math.max(4, Math.round(4 * uiScale));

  const handleOpenLogs = useCallback(() => {
    logButtonPress('view_logs');
    setIsLogsVisible(true);
  }, [logButtonPress]);

  const handleOpenSettings = useCallback(() => {
    logButtonPress('open_settings');
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
    setAdminAccessCode('');
  }, [clearAdminSession]);

  const handleAdminAccessCodeChange = useCallback((value) => {
    setAdminAccessCode(value);
  }, []);

  const handleSubmitAdminAccess = useCallback(async () => {
    const didUnlock = await loadAnalytics(adminAccessCode);

    if (!didUnlock) {
      return;
    }

    logButtonPress('open_admin_analytics');
    setIsAdminAccessVisible(false);
    setIsAdminAnalyticsVisible(true);
    setAdminAccessCode('');
  }, [adminAccessCode, loadAnalytics, logButtonPress]);

  const handleCloseAdminAnalytics = useCallback(() => {
    clearAdminSession();
    setIsAdminAnalyticsVisible(false);
    setAdminAccessCode('');
  }, [clearAdminSession]);

  const handleOpenLogsFromSettings = useCallback(() => {
    setIsSettingsVisible(false);
    handleOpenLogs();
  }, [handleOpenLogs]);

  const handleCloseLogs = useCallback(() => {
    setIsLogsVisible(false);
  }, []);

  const handleGridScrollMetrics = useCallback(
    ({ offsetY, contentHeight, viewportHeight }) => {
      const maxOffset = Math.max(0, contentHeight - viewportHeight);
      const scrollable = maxOffset > 0;
      const progress = scrollable
        ? Math.max(0, Math.min(1, offsetY / maxOffset))
        : 0;
      const ratio = scrollable
        ? Math.max(0.2, Math.min(1, viewportHeight / contentHeight))
        : 1;

      setGridScroll((prev) => {
        if (
          prev.progress === progress
          && prev.thumbRatio === ratio
          && prev.scrollable === scrollable
        ) {
          return prev;
        }

        return { progress, thumbRatio: ratio, scrollable };
      });
    },
    [],
  );

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

  const {
    sentence,
    addWord,
    removeLastWord,
    clearSentence,
    speakSentence,
  } = useSentenceBuilder({ onLogPress: logButtonPress });

  const words = useMemo(() => {
    const roomWords = currentRoom ? currentRoom.suggestions : DEFAULT_SUGGESTIONS;
    return mergeUniqueWords(CORE_WORDS, roomWords);
  }, [currentRoom]);
  const suggestedColor = currentRoom ? currentRoom.color : '#6C63FF';
  const activeCategoryColor = suggestedColor;
  const indicatorTrackColor = hexToRgba(activeCategoryColor, 0.24);
  const indicatorThumbColor = activeCategoryColor;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <AppHeader onOpenSettings={handleOpenSettings} uiScale={uiScale} />
      <SentenceBar
        sentence={sentence}
        onRemoveLastWord={removeLastWord}
        onClearSentence={clearSentence}
        onSpeakSentence={speakSentence}
        uiScale={uiScale}
      />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <WordGrid
          words={words}
          activeCategoryColor={activeCategoryColor}
          onAddWord={addWord}
          uiScale={uiScale}
          onScrollMetricsChange={handleGridScrollMetrics}
        />
        {gridScroll.scrollable ? (
          <View
            style={{
              width: indicatorWidth,
              marginRight: Math.round(4 * uiScale),
              marginTop: Math.round(12 * uiScale),
              marginBottom: Math.round(12 * uiScale),
              borderRadius: 999,
              backgroundColor: indicatorTrackColor,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${gridScroll.progress * (1 - gridScroll.thumbRatio) * 100}%`,
                height: `${gridScroll.thumbRatio * 100}%`,
                borderRadius: 999,
                backgroundColor: indicatorThumbColor,
              }}
            />
          </View>
        ) : null}
        <RoomSelector
          rooms={allRooms}
          activeRoomId={currentRoom?.id ?? null}
          onSelectRoom={handleSelectRoom}
          uiScale={uiScale}
          railWidth={roomRailWidth}
        />
      </View>
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
      <SettingsMenuOverlay
        visible={isSettingsVisible}
        onClose={handleCloseSettings}
        onOpenAdminAnalytics={handleOpenAdminAnalytics}
        onViewLogs={handleOpenLogsFromSettings}
        uiScale={uiScale}
      />
    </SafeAreaView>
  );
}
