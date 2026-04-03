import { useEffect, useRef, useCallback } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';

const { BLEBeaconModule } = NativeModules;

/**
 * useBLE — Android
 *
 * Wraps the native Kotlin BLEBeaconModule. Uses the hardware-level
 * manufacturer data filter to detect iBeacons before Android 12+
 * userspace stripping runs.
 *
 * @param {function} onBeacon  - called with { uuid, major, minor, rssi, txPower, mac }
 * @param {function} onError   - called with { message }
 * @param {boolean}  autoStart - start scanning immediately on mount (default true)
 */
export function useBLE({ onBeacon, onError, autoStart = true } = {}) {
  const emitterRef = useRef(null);
  const listenersRef = useRef([]);

  const startScan = useCallback(() => {
    if (!BLEBeaconModule) {
      onError?.({ message: 'BLEBeaconModule not available — check MainApplication registration' });
      return;
    }
    BLEBeaconModule.startScan();
  }, [onError]);

  const stopScan = useCallback(() => {
    BLEBeaconModule?.stopScan();
  }, []);

  useEffect(() => {
    if (!BLEBeaconModule) {
      onError?.({ message: 'BLEBeaconModule not found. Ensure BLEBeaconPackage is registered in MainApplication.' });
      return;
    }

    emitterRef.current = new NativeEventEmitter(BLEBeaconModule);

    const beaconListener = emitterRef.current.addListener(
      'onBeaconDetected',
      (event) => onBeacon?.(event)
    );

    const errorListener = emitterRef.current.addListener(
      'onBeaconError',
      (event) => onError?.(event)
    );

    listenersRef.current = [beaconListener, errorListener];

    if (autoStart) {
      startScan();
    }

    return () => {
      stopScan();
      listenersRef.current.forEach((l) => l.remove());
      listenersRef.current = [];
    };
  }, []); // intentionally empty — listeners are stable refs

  return { startScan, stopScan };
}