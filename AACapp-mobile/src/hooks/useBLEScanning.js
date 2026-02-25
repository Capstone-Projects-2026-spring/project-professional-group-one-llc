/**
 * useBLEScanning.js
 * -----------------
 * Handles all raw Bluetooth Low Energy scanning logic.
 *
 * Scans for nearby BLE devices, tracks the strongest RSSI signal
 * per device ID, and returns the ID of the closest known beacon.
 *
 * Uses MAC address as the beacon identifier on Android (device.id).
 * Falls back to serviceUUIDs if present.
 *
 * This hook does NOT know anything about rooms — it just returns
 * the winning beacon ID. Room lookup is handled upstream in
 * useLocationDetection.js.
 *
 * Requires: react-native-ble-plx
 * Install:  npx expo install react-native-ble-plx
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { getRoomByBeaconId } from '../data/roomContexts';

const SCAN_WINDOW = 3000;   // ms — how long each scan window runs
const SCAN_COOLDOWN = 2000; // ms — pause between scan windows
const MIN_RSSI = -80;      // dBm — lower this if beacon is weak; raise to filter noise

/**
 * Request Android BLE permissions at runtime.
 * iOS permissions are declared in app.json via the plugin config.
 */
async function requestAndroidPermissions() {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(results).every(
      (r) => r === PermissionsAndroid.RESULTS.GRANTED
    );
  } else {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
}

/**
 * Extract identifiers from a scanned BLE device.
 *
 * Priority:
 *   1. serviceUUIDs — present on some beacons (e.g. Eddystone)
 *   2. device.id    — MAC address on Android, system ID on iOS
 *
 * For BC011 iBeacons on Android, serviceUUIDs is null so we fall
 * back to device.id (the MAC address). Make sure your beaconId
 * values in roomContexts.js match the MAC format: "DD:88:00:00:14:22"
 */
function extractIDs(device) {
  const ids = [];

  if (device.serviceUUIDs && device.serviceUUIDs.length > 0) {
    ids.push(...device.serviceUUIDs);
  }

  if (ids.length === 0 && device.id) {
    ids.push(device.id);
  }

  return ids;
}

/**
 * useBLEScanning
 * --------------
 * @returns {object} {
 *   strongestBeaconId : string | null  — ID of closest known beacon
 *   isScanning        : boolean
 *   error             : string | null
 *   startScanning     : () => void
 *   stopScanning      : () => void
 * }
 */
export default function useBLEScanning() {
  const [strongestBeaconId, setStrongestBeaconId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  const managerRef = useRef(null);
  const rssiMapRef = useRef({});  // { [id: string]: number[] }
  const scanTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ── Evaluate scan window results ───────────────────────────────────
  // Filters to known beacons only, then picks the strongest by avg RSSI
  const evaluateScan = useCallback(() => {
    const rssiMap = rssiMapRef.current;
    const ids = Object.keys(rssiMap);

    if (ids.length === 0) {
      console.log('[BLE] No devices heard this window.');
      return;
    }

    let bestID = null;
    let bestRSSI = -Infinity;

    ids.forEach((id) => {
      const room = getRoomByBeaconId(id);
      if (!room) return; // ignore unknown devices

      const readings = rssiMap[id];
      const avgRSSI = readings.reduce((a, b) => a + b, 0) / readings.length;
      console.log(`[BLE] Known beacon: ${room.label} (${id}) @ avg RSSI ${avgRSSI.toFixed(1)} dBm`);

      if (avgRSSI > bestRSSI) {
        bestRSSI = avgRSSI;
        bestID = id;
      }
    });

    if (bestID) {
      console.log(`[BLE] Best known beacon: ${bestID} @ ${bestRSSI.toFixed(1)} dBm`);
      if (isMountedRef.current) setStrongestBeaconId(bestID);
    } else {
      console.log('[BLE] No known beacons in range.');
    }

    rssiMapRef.current = {};
  }, []);

  // ── Core scan cycle ────────────────────────────────────────────────
  const runScanCycle = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    rssiMapRef.current = {};
    setIsScanning(true);
    console.log('[BLE] Starting scan window...');

    manager.startDeviceScan(null, null, (scanError, device) => {
      if (scanError) {
        console.warn('[BLE] Scan error:', scanError.message);
        setError(scanError.message);
        return;
      }

      if (!device || device.rssi === null) return;
      if (device.rssi < MIN_RSSI) return;

      // Log full device info to help diagnose beacon detection issues
      console.log(`[BLE] Device: ${JSON.stringify({
        id: device.id,
        name: device.localName,
        serviceUUIDs: device.serviceUUIDs,
        rssi: device.rssi,
      })}`);

      const ids = extractIDs(device);
      ids.forEach((id) => {
        if (!rssiMapRef.current[id]) rssiMapRef.current[id] = [];
        rssiMapRef.current[id].push(device.rssi);
      });
    });

    // After scan window ends, evaluate and schedule next cycle
    scanTimerRef.current = setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      evaluateScan();

      cooldownTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) runScanCycle();
      }, SCAN_COOLDOWN);
    }, SCAN_WINDOW);
  }, [evaluateScan]);

  // ── Public controls ────────────────────────────────────────────────
  const stopScanning = useCallback(() => {
    clearTimeout(scanTimerRef.current);
    clearTimeout(cooldownTimerRef.current);
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    console.log('[BLE] Scanning stopped.');
  }, []);

  const startScanning = useCallback(async () => {
    setError(null);
    const hasPermission = await requestAndroidPermissions();
    if (!hasPermission) {
      setError('Bluetooth permissions denied.');
      console.warn('[BLE] Permissions not granted.');
      return;
    }
    runScanCycle();
  }, [runScanCycle]);

  // ── Lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    managerRef.current = new BleManager();

    const subscription = managerRef.current.onStateChange((state) => {
      console.log(`[BLE] Adapter state: ${state}`);
      if (state === 'PoweredOn') {
        subscription.remove();
        startScanning();
      } else if (state === 'PoweredOff') {
        setError('Bluetooth is turned off. Please enable it.');
        stopScanning();
      } else if (state === 'Unauthorized') {
        setError('Bluetooth permission not granted.');
      }
    }, true);

    return () => {
      isMountedRef.current = false;
      subscription.remove();
      stopScanning();
      managerRef.current?.destroy();
    };
  }, [startScanning, stopScanning]);

  return {
    strongestBeaconId,
    isScanning,
    error,
    startScanning,
    stopScanning,
  };
}