import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import styles from '../styles/appStyles';

const formatTimestamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return date.toLocaleString();
};

const renderRecentLog = ({ item }) => (
  <View style={styles.logEntryCard}>
    <Text style={styles.logEntryTitle}>{item.buttonName}</Text>
    <Text style={styles.logEntryLine}>{`Time: ${formatTimestamp(item.pressedAt)}`}</Text>
    <Text style={styles.logEntryLine}>{`Room: ${item.roomLabel ?? 'General'}`}</Text>
    <Text style={styles.logEntryLine}>{`Device: ${item.deviceId}`}</Text>
  </View>
);

const StatCard = ({ label, value }) => (
  <View style={styles.analyticsStatCard}>
    <Text style={styles.analyticsStatValue}>{value}</Text>
    <Text style={styles.analyticsStatLabel}>{label}</Text>
  </View>
);

const RankedList = ({ title, emptyLabel, items, renderLabel }) => (
  <View style={styles.analyticsSection}>
    <Text style={styles.analyticsSectionTitle}>{title}</Text>
    {items.length === 0 ? (
      <Text style={styles.analyticsEmptyText}>{emptyLabel}</Text>
    ) : (
      items.map((item, index) => (
        <View key={`${title}-${renderLabel(item)}-${index}`} style={styles.analyticsRankRow}>
          <Text style={styles.analyticsRankLabel}>{`${index + 1}. ${renderLabel(item)}`}</Text>
          <Text style={styles.analyticsRankValue}>{item.total}</Text>
        </View>
      ))
    )}
  </View>
);

export default function AdminAnalyticsModal({
  visible,
  analytics,
  errorMessage,
  isLoading,
  onClose,
  onRefresh,
}) {
  const androidStatusBarInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const topPadding = 10 + androidStatusBarInset;
  const totals = analytics?.totals ?? {
    interactions: 0,
    devices: 0,
    rooms: 0,
    buttons: 0,
  };
  const recentLogs = analytics?.recentLogs ?? [];
  const topButtons = analytics?.topButtons ?? [];
  const topRooms = analytics?.topRooms ?? [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.logsModalSafeArea}>
        <View style={[styles.logsModalContainer, { paddingTop: topPadding }]}>
          <View style={styles.logsHeaderRow}>
            <View>
              <Text style={styles.logsTitle}>Admin Analytics</Text>
              <Text style={styles.analyticsSubtitle}>
                {analytics?.generatedAt
                  ? `Updated ${formatTimestamp(analytics.generatedAt)}`
                  : 'Supabase interaction summary'}
              </Text>
            </View>
            <View style={styles.logsHeaderActions}>
              <Pressable
                style={[styles.logsExportButton, isLoading ? styles.logsExportButtonDisabled : null]}
                onPress={onRefresh}
                disabled={isLoading}
              >
                <Text style={styles.logsExportButtonText}>{isLoading ? 'Refreshing...' : 'Refresh'}</Text>
              </Pressable>
              <Pressable style={styles.logsCloseButton} onPress={onClose}>
                <Text style={styles.logsCloseButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>

          {errorMessage ? <Text style={styles.adminAccessErrorText}>{errorMessage}</Text> : null}

          <View style={styles.analyticsStatGrid}>
            <StatCard label="Interactions" value={totals.interactions} />
            <StatCard label="Devices" value={totals.devices} />
            <StatCard label="Rooms" value={totals.rooms} />
            <StatCard label="Buttons" value={totals.buttons} />
          </View>

          <RankedList
            title="Top Buttons"
            emptyLabel="No interaction data in the selected window."
            items={topButtons}
            renderLabel={(item) => item.buttonName}
          />

          <RankedList
            title="Top Rooms"
            emptyLabel="No room activity recorded yet."
            items={topRooms}
            renderLabel={(item) => item.roomLabel}
          />

          <View style={styles.analyticsSection}>
            <Text style={styles.analyticsSectionTitle}>Recent Activity</Text>
            {recentLogs.length === 0 ? (
              <Text style={styles.analyticsEmptyText}>No recent interactions found.</Text>
            ) : (
              <FlatList
                data={recentLogs}
                keyExtractor={(item, index) => `${item.id ?? item.pressedAt}-${index}`}
                contentContainerStyle={styles.logsListContent}
                renderItem={renderRecentLog}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
