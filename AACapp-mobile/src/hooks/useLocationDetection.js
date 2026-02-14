import { useState, useCallback } from 'react';
import { getRoomByBeaconId, getAllRooms } from '../data/roomContexts';

/**
 * useLocationDetection
 * --------------------
 * Abstraction layer for room / location detection.
 *
 * TODAY  → manual selection via `setRoomManually(roomId)`
 * FUTURE → swap the internals to use expo-ble / react-native-ble-plx
 *          to listen for beacon advertisements and call
 *          `getRoomByBeaconId(uuid)` automatically.
 *
 * The hook returns the same shape regardless of detection method,
 * so the rest of the app doesn't need to change when BLE is added.
 *
 * Returns
 * -------
 * {
 *   currentRoom   : object | null   – the active room context
 *   detectionMode : 'manual' | 'bluetooth'
 *   setRoomManually : (roomId: string | null) => void
 *   allRooms      : array           – all available room definitions
 * }
 */
export default function useLocationDetection() {
  const [currentRoom, setCurrentRoom] = useState(null);

  // ── Manual mode (placeholder for Bluetooth) ──────────────────────
  const setRoomManually = useCallback((roomId) => {
    if (!roomId) {
      setCurrentRoom(null);
      return;
    }
    const rooms = getAllRooms();
    const match = rooms.find((r) => r.id === roomId) || null;
    setCurrentRoom(match);
  }, []);

  // ── Future: Bluetooth beacon scanning ────────────────────────────
  // When BLE is ready, add a useEffect here that:
  //   1. Starts scanning for BLE beacons
  //   2. On detection, calls getRoomByBeaconId(beacon.uuid)
  //   3. Calls setCurrentRoom(room)
  //   4. Returns a cleanup that stops scanning
  //
  // Example (pseudo-code):
  // useEffect(() => {
  //   const subscription = BleManager.startScanning((beacon) => {
  //     const room = getRoomByBeaconId(beacon.uuid);
  //     if (room) setCurrentRoom(room);
  //   });
  //   return () => subscription.stop();
  // }, []);

  return {
    currentRoom,
    detectionMode: 'manual', // change to 'bluetooth' once BLE is wired
    setRoomManually,
    allRooms: getAllRooms(),
  };
}
