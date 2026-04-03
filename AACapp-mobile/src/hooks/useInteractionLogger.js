import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { createInteractionLog } from '../services/interactionRepository';

/**
 * createDeviceId
 * --------------
 * Generates a stable-ish identifier for the device based on platform and OS version.
 */
const createDeviceId = () => {
  const rawVersion =
    Platform.Version ??
    Platform.constants?.osVersion ??
    Platform.constants?.systemVersion;
  const normalizedVersion = rawVersion
    ? String(rawVersion).split('.')[0]
    : 'unknown';
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `${Platform.OS}-${normalizedVersion}-${randomSuffix}`;
};

/**
 * useInteractionLogger
 * --------------------
 * Hook to record interaction events.
 * Manages local state for immediate feedback and syncs asynchronously to Supabase.
 */
export default function useInteractionLogger(currentRoom, userId = null) {
  const [deviceId] = useState(createDeviceId);
  const [interactionLogs, setInteractionLogs] = useState([]);

  const logButtonPress = useCallback(
    (buttonName, metadata = {}) => {
      // Determine the context location (room)
      const location = currentRoom
        ? { id: currentRoom.id, label: currentRoom.label }
        : { id: 'general', label: 'General' };

      const pressedAt = new Date().toISOString();

      // Create local log entry for UI/debugging
      const entry = {
        deviceId,
        buttonName,
        pressedAt,
        location,
        synced: null, // null = pending, true = success, false = failed
        ...metadata,
      };

      // 1. Update local state immediately
      setInteractionLogs((prev) => [...prev, entry]);

      // 2. Console mirror for development visibility
      console.log('[InteractionLog]', JSON.stringify(entry));

      // 3. Fire-and-forget sync to Supabase (non-blocking)
      void createInteractionLog({
        userId,
        deviceId,
        buttonName,
        pressedAt,
        roomId: location.id,
        roomLabel: location.label,
        metadata,
      })
        .then(() => {
          // Update status to success
          setInteractionLogs((prev) =>
            prev.map((log) =>
              log.pressedAt === pressedAt ? { ...log, synced: true } : log,
            ),
          );
        })
        .catch((error) => {
          console.warn('[InteractionLog] Sync failed:', error.message);
          // Update status to failed
          setInteractionLogs((prev) =>
            prev.map((log) =>
              log.pressedAt === pressedAt
                ? { ...log, synced: false, syncError: error.message }
                : log,
            ),
          );
        });
    },
    [currentRoom, deviceId, userId],
  );

  return {
    deviceId,
    interactionLogs,
    logButtonPress,
  };
}
