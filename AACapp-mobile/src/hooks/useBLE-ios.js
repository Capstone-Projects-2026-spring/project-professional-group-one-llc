import { useCallback } from 'react';

/**
 * useBLE — iOS stub
 *
 * BLE beacon scanning via custom Kotlin native module is Android-only.
 * React Native's bundler picks this file automatically on iOS.
 *
 * If iOS BLE support is needed in future, implement here using
 * react-native-ble-plx or CoreBluetooth via a Swift native module.
 */
export function useBLE({ onError } = {}) {
  const noop = useCallback(() => {}, []);

  // Notify the caller so the UI can gracefully hide BLE-dependent features
  // without crashing. Called once on mount via the no-op useEffect pattern.
  if (onError) {
    // Use a timeout so the caller's component is mounted before receiving this
    setTimeout(() => {
      onError({ message: 'BLE beacon scanning is not available on iOS in this build.' });
    }, 0);
  }

  return {
    startScan: noop,
    stopScan: noop,
  };
}