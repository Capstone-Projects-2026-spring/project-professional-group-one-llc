import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useCallback, useState } from 'react';
import styles from '../styles/appStyles';

const formatTimestamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const renderLogItem = ({ item, index }) => (
  <View style={styles.logEntryCard}>
    <Text style={styles.logEntryTitle}>{`${index + 1}. ${item.buttonName}`}</Text>
    <Text style={styles.logEntryLine}>{`Time: ${formatTimestamp(item.pressedAt)}`}</Text>
    <Text style={styles.logEntryLine}>{`Room: ${item.location?.label ?? 'General'}`}</Text>
    <Text style={styles.logEntryLine}>{`Device: ${item.deviceId}`}</Text>
    {item.word ? <Text style={styles.logEntryLine}>{`Word: ${item.word}`}</Text> : null}
    {typeof item.sentenceLength === 'number' ? (
      <Text style={styles.logEntryLine}>{`Sentence length: ${item.sentenceLength}`}</Text>
    ) : null}
    {item.category ? <Text style={styles.logEntryLine}>{`Category: ${item.category}`}</Text> : null}
  </View>
);

export default function InteractionLogModal({ visible, logs, onClose }) {
  const androidStatusBarInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const topPadding = 10 + androidStatusBarInset;
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJson = useCallback(async () => {
    if (logs.length === 0 || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const exportedAt = new Date().toISOString();
      const payload = JSON.stringify(
        {
          exportedAt,
          totalLogs: logs.length,
          logs,
        },
        null,
        2,
      );

      if (Platform.OS === 'web') {
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `interaction-logs-${Date.now()}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        return;
      }

      await Share.share({
        title: 'Interaction Logs JSON',
        message: payload,
      });
    } catch (error) {
      Alert.alert('Export failed', 'Could not export logs as JSON. Please try again.');
      console.error('Failed to export logs:', error);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, logs]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.logsModalSafeArea}>
        <View
          style={[
            styles.logsModalContainer,
            { paddingTop: topPadding },
          ]}
        >
          <View style={styles.logsHeaderRow}>
            <Text style={styles.logsTitle}>Interaction Logs</Text>
            <View style={styles.logsHeaderActions}>
              <Pressable
                style={[styles.logsExportButton, logs.length === 0 ? styles.logsExportButtonDisabled : null]}
                onPress={handleExportJson}
                disabled={logs.length === 0 || isExporting}
              >
                <Text style={styles.logsExportButtonText}>{isExporting ? 'Exporting...' : 'Export JSON'}</Text>
              </Pressable>
              <Pressable style={styles.logsCloseButton} onPress={onClose}>
                <Text style={styles.logsCloseButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>

          {logs.length === 0 ? (
            <View style={styles.logsEmptyState}>
              <Text style={styles.logsEmptyText}>No logs recorded yet.</Text>
            </View>
          ) : (
            <FlatList
              data={[...logs].reverse()}
              keyExtractor={(item, index) => `${item.pressedAt}-${index}`}
              contentContainerStyle={styles.logsListContent}
              renderItem={renderLogItem}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
