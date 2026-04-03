// import { useEffect, useCallback } from 'react';
// // import { useBLE } from './useBLE';
// import { useBLE } from './useBLE-android';
// import { start as startMovementSensor, stop as stopMovementSensor } from './movementSensor';

// /**
//  * useLocationAwareBLE — Android
//  * ─────────────────────────────
//  * Wires the movement sensor to the BLE scanner.
//  *
//  * Flow:
//  *   Accelerometer detects ≥5 m walked → device stops →
//  *   movementSensor fires → startScan() → Kotlin BLEBeaconModule scans →
//  *   onBeacon callback fires with beacon data
//  *
//  * The movement sensor and BLE scanner are both cleaned up on unmount.
//  *
//  * @param {function} onBeacon  - ({ uuid, major, minor, rssi, txPower, mac }) => void
//  * @param {function} onError   - ({ message }) => void
//  */
// export function useLocationAwareBLE({ onBeacon, onError } = {}) {
//   // Don't auto-start BLE — the movement sensor decides when to scan
//   const { startScan, stopScan } = useBLE({ onBeacon, onError, autoStart: false });

//   const triggerScan = useCallback(() => {
//     console.log('[useLocationAwareBLE] Movement threshold reached — starting BLE scan.');
//     startScan();
//   }, [startScan]);

//   useEffect(() => {
//     startMovementSensor(triggerScan);

//     return () => {
//       stopMovementSensor();
//       stopScan();
//     };
//   }, [triggerScan]);
// }

// import { useEffect, useRef } from 'react';
// import { NativeModules, NativeEventEmitter } from 'react-native';

// const { BLEBeaconModule } = NativeModules;

// export function useLocationAwareBLE({ onBeacon, onError } = {}) {
//   const onBeaconRef = useRef(onBeacon);
//   const onErrorRef  = useRef(onError);
//   useEffect(() => { onBeaconRef.current = onBeacon; }, [onBeacon]);
//   useEffect(() => { onErrorRef.current  = onError;  }, [onError]);

//   useEffect(() => {
//     if (!BLEBeaconModule) {
//       onErrorRef.current?.({ message: 'BLEBeaconModule not found.' });
//       return;
//     }

//     const emitter   = new NativeEventEmitter(BLEBeaconModule);
//     const listeners = [
//       emitter.addListener('onBeaconDetected', (e) => onBeaconRef.current?.(e)),
//       emitter.addListener('onBeaconError',    (e) => onErrorRef.current?.(e)),
//     ];

//     BLEBeaconModule.startScan();

//     return () => {
//       BLEBeaconModule.stopScan();
//       listeners.forEach((l) => l.remove());
//     };
//   }, []);
// }

import { useEffect, useRef } from 'react';
import { NativeModules, NativeEventEmitter, PermissionsAndroid, Platform } from 'react-native';

const { BLEBeaconModule } = NativeModules;

async function requestBLEPermissions() {
  const grants = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);
  return Object.values(grants).every(
    (v) => v === PermissionsAndroid.RESULTS.GRANTED
  );
}

export function useLocationAwareBLE({ onBeacon, onError } = {}) {
  const onBeaconRef = useRef(onBeacon);
  const onErrorRef  = useRef(onError);
  useEffect(() => { onBeaconRef.current = onBeacon; }, [onBeacon]);
  useEffect(() => { onErrorRef.current  = onError;  }, [onError]);

  useEffect(() => {
    if (!BLEBeaconModule) {
      onErrorRef.current?.({ message: 'BLEBeaconModule not found.' });
      return;
    }

    const emitter = new NativeEventEmitter(BLEBeaconModule);
    const listeners = [
      emitter.addListener('onBeaconDetected', (e) => onBeaconRef.current?.(e)),
      emitter.addListener('onBeaconError',    (e) => onErrorRef.current?.(e)),
    ];

    requestBLEPermissions().then((granted) => {
      if (!granted) {
        onErrorRef.current?.({ message: 'BLE permissions denied.' });
        return;
      }
      BLEBeaconModule.startScan();
    });

    return () => {
      BLEBeaconModule.stopScan();
      listeners.forEach((l) => l.remove());
    };
  }, []);
}