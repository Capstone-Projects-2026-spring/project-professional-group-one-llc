import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

const createDeviceId = () => {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `${Platform.OS}-${Platform.Version}-${randomSuffix}`;
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
    },
    [currentRoom, deviceId],
  );

  return {
    deviceId,
    interactionLogs,
    logButtonPress,
  };
}
