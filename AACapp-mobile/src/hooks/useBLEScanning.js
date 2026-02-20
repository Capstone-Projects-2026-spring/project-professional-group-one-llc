/**
 * useBLEScanning.js
 * -----------------
 * Handles all raw Bluetooth Low Energy scanning logic.
 *
 * Scans for nearby BLE devices, tracks the strongest RSSI signal
 * per device UUID, and returns the UUID of the closest beacon.
 *
 * This hook does NOT know anything about rooms — it just returns
 * the winning beacon UUID. Room lookup is handled upstream in
 * useLocationDetection.js.
 *
 * Requires: react-native-ble-plx
 * Install:  npx expo install react-native-ble-plx
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

// How long each scan window runs before we evaluate results (ms)
const SCAN_WINDOW = 3000;

// Minimum RSSI to consider a beacon (filters out distant noise)
// RSSI is negative — closer to 0 means stronger signal
// -80 is a reasonable cutoff; tune this based on your environment
const MIN_RSSI = -80;

// How long to wait between scan windows (ms) — prevents BLE stack spam
const SCAN_COOLDOWN = 2000;

/**
 * Request Android BLE permissions at runtime.
 * iOS permissions are handled via Info.plist / app.json plugin config —
 * no runtime request needed on iOS.
 */
async function requestAndroidPermissions() {
  if (Platform.OS !== 'android') return true;

  // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
  // Android 11 and below requires ACCESS_FINE_LOCATION
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
 * Extract all UUIDs advertised by a scanned BLE device.
 *
 * react-native-ble-plx exposes service UUIDs in two places:
 *   1. device.serviceUUIDs  — array of UUIDs from the advertisement packet
 *   2. device.id            — the device's MAC address (Android) or
 *                             a system-assigned identifier (iOS)
 *
 * For iBeacon and most generic BLE beacons, the primary UUID you want
 * is in serviceUUIDs[0]. If your beacons advertise a specific service,
 * that UUID will appear here.
 *
 * Returns an array of UUID strings (may be empty if beacon advertises none).
 */
function extractUUIDs(device) {
  const uuids = [];

  if (device.serviceUUIDs && device.serviceUUIDs.length > 0) {
    uuids.push(...device.serviceUUIDs);
  }

  // Fallback: use device.id if no service UUIDs found.
  // On Android this is the MAC address. Useful if your beacons
  // are identified by hardware address rather than service UUID.
  if (uuids.length === 0 && device.id) {
    uuids.push(device.id);
  }

  return uuids;
}

/**
 * useBLEScanning
 * --------------
 * @returns {object} {
 *   strongestBeaconId : string | null  — UUID of closest beacon
 *   isScanning        : boolean
 *   error             : string | null
 *   startScanning     : () => void     — call to manually trigger a scan
 *   stopScanning      : () => void
 * }
 */
export default function useBLEScanning() {
  const [strongestBeaconId, setStrongestBeaconId] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  // BleManager instance — kept in a ref so it persists across renders
  // without triggering re-renders itself
  const managerRef = useRef(null);

  // Accumulates RSSI readings per UUID during a scan window
  // Shape: { [uuid: string]: number[] }
  const rssiMapRef = useRef({});

  // Scan cycle timer
  const scanTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);

  const isMountedRef = useRef(true);

  // ── Evaluate scan results and pick the winner ──────────────────────
  const evaluateScan = useCallback(() => {
    const rssiMap = rssiMapRef.current;
    const uuids = Object.keys(rssiMap);

    if (uuids.length === 0) return;

    // For each UUID, take the average RSSI across all readings
    // then pick the UUID with the strongest (highest) average
    let bestUUID = null;
    let bestRSSI = -Infinity;

    uuids.forEach((uuid) => {
      const readings = rssiMap[uuid];
      const avgRSSI = readings.reduce((a, b) => a + b, 0) / readings.length;

      if (avgRSSI > bestRSSI) {
        bestRSSI = avgRSSI;
        bestUUID = uuid;
      }
    });

    console.log(`[BLE] Best beacon: ${bestUUID} @ avg RSSI ${bestRSSI.toFixed(1)} dBm`);

    if (isMountedRef.current && bestUUID) {
      setStrongestBeaconId(bestUUID);
    }

    // Reset for next scan window
    rssiMapRef.current = {};
  }, []);

  // ── Core scan logic ────────────────────────────────────────────────
  const runScanCycle = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    rssiMapRef.current = {};
    setIsScanning(true);

    console.log('[BLE] Starting scan window...');

    // Start scanning — null, null means scan all services (no UUID filter)
    // If you know your beacon service UUIDs, pass them here to be more efficient:
    // manager.startDeviceScan(['YOUR-SERVICE-UUID'], null, callback)
    manager.startDeviceScan(null, null, (scanError, device) => {
      if (scanError) {
        console.warn('[BLE] Scan error:', scanError.message);
        setError(scanError.message);
        return;
      }

      if (!device || device.rssi === null) return;

      // Filter out weak signals
      if (device.rssi < MIN_RSSI) return;

      // Collect all UUIDs this device is advertising
      const uuids = extractUUIDs(device);

      uuids.forEach((uuid) => {
        if (!rssiMapRef.current[uuid]) {
          rssiMapRef.current[uuid] = [];
        }
        rssiMapRef.current[uuid].push(device.rssi);

        console.log(`[BLE] Heard: ${uuid} RSSI: ${device.rssi} dBm`);
      });
    });

    // After the scan window, stop and evaluate
    scanTimerRef.current = setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      evaluateScan();

      // Wait for cooldown then scan again
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

    // Create the BLE manager instance
    managerRef.current = new BleManager();

    // Wait for Bluetooth to be powered on before scanning
    // 'PoweredOn' is the state we need — could be delayed on cold start
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
    }, true); // true = emit current state immediately

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