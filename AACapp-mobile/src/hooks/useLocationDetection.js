/**
 * useLocationDetection.js
 * -----------------------
 * Abstraction layer for room / location detection.
 *
 * Replaces the manual-only stub with real Bluetooth beacon scanning.
 * Uses useBLEScanning to get the strongest nearby beacon UUID, then
 * looks it up in roomContexts to resolve the current room.
 *
 * The return shape is IDENTICAL to the original — App.js and
 * RoomSelector don't need any changes.
 *
 * Returns
 * -------
 * {
 *   currentRoom     : object | null   – the active room context
 *   detectionMode   : 'manual' | 'bluetooth'
 *   setRoomManually : (roomId: string | null) => void  – manual override
 *   allRooms        : array           – all available room definitions
 *   bleError        : string | null   – BLE error message if any
 *   isScanning      : boolean         – true while a scan window is active
 * }
 */

import { useState, useCallback, useEffect } from 'react';
import { getRoomByBeaconId, getAllRooms } from '../data/roomContexts';
import useBLEScanning from './useBLEScanning';

export default function useLocationDetection() {
  const [currentRoom, setCurrentRoom] = useState(null);

  // manualOverride: when set, BLE results are ignored until cleared
  // This preserves the manual room selector functionality
  const [manualOverride, setManualOverride] = useState(false);

  const {
    strongestBeaconId,
    isScanning,
    error: bleError,
  } = useBLEScanning();

  // ── React to new BLE scan results ──────────────────────────────────
  useEffect(() => {
    // Don't override a manual selection with BLE
    if (manualOverride) return;

    if (!strongestBeaconId) return;

    const room = getRoomByBeaconId(strongestBeaconId);

    if (room) {
      console.log(`[Location] Detected room: ${room.label} via beacon ${strongestBeaconId}`);
      setCurrentRoom(room);
    } else {
      // Beacon was heard but doesn't match any known room
      // This is expected if non-room BLE devices are nearby (phones, etc.)
      console.log(`[Location] Unknown beacon: ${strongestBeaconId} — no room match`);
    }
  }, [strongestBeaconId, manualOverride]);

  // ── Manual override ────────────────────────────────────────────────
  // Keeps the RoomSelector working as a fallback / demo tool.
  // Calling setRoomManually(null) clears the override and hands
  // control back to BLE scanning.
  const setRoomManually = useCallback((roomId) => {
    if (!roomId) {
      setManualOverride(false);
      setCurrentRoom(null); // BLE will repopulate on next scan
      return;
    }

    const rooms = getAllRooms();
    const match = rooms.find((r) => r.id === roomId) || null;

    if (match) {
      setManualOverride(true); // Pause BLE-driven updates
      setCurrentRoom(match);
    }
  }, []);

  return {
    currentRoom,
    detectionMode: manualOverride ? 'manual' : 'bluetooth',
    setRoomManually,
    allRooms: getAllRooms(),
    bleError,
    isScanning,
  };
}