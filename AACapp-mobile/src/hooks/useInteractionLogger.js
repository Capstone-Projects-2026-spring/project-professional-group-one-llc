import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

let insertInteractionLogRef = null;

function getInsertInteractionLog() {
  if (insertInteractionLogRef) {
    return insertInteractionLogRef;
  }

  try {
    insertInteractionLogRef = require('../services/interactionRepository').insertInteractionLog;
    return insertInteractionLogRef;
  } catch (error) {
    return null;
  }
}

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

export default function useInteractionLogger(currentRoom) {
  const [deviceId] = useState(createDeviceId);
  const [interactionLogs, setInteractionLogs] = useState([]);

  const logButtonPress = useCallback(
    (buttonName, metadata = {}) => {
      const location = currentRoom
        ? { id: currentRoom.id, label: currentRoom.label }
        : { id: 'general', label: 'General' };

      const entry = {
        deviceId,
        buttonName,
        pressedAt: new Date().toISOString(),
        location,
        ...metadata,
      };

      setInteractionLogs((prev) => [...prev, entry]);
      console.log('[InteractionLog]', JSON.stringify(entry));

      const insertInteractionLog = getInsertInteractionLog();
      if (!insertInteractionLog) {
        return;
      }

      void insertInteractionLog({
        deviceId,
        buttonName,
        pressedAt: entry.pressedAt,
        roomId: location.id,
        roomLabel: location.label,
        metadata,
      }).catch((error) => {
        console.warn('[InteractionLog] Supabase sync failed:', error.message);
      });
    },
    [currentRoom, deviceId],
  );

  return {
    deviceId,
    interactionLogs,
    logButtonPress,
  };
}
