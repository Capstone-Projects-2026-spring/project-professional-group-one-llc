/**
 * useBLEScanning.js
 * -----------------
 * Handles iBeacon ranging using react-native-ibeacon.
 *
 * Unlike react-native-ble-plx, react-native-ibeacon uses the native
 * iBeacon APIs on both platforms (CoreLocation on iOS, AltBeacon on
 * Android) which correctly parse iBeacon manufacturer data. This is
 * necessary because Android 12+ strips Apple manufacturer data from
 * generic BLE scan results before they reach userspace libraries.
 *
 * How it works:
 *   - You register every known beacon UUID from roomContexts.js as a
 *     "region" to range for. The library calls back with RSSI whenever
 *     a beacon matching that UUID is in range.
 *   - We accumulate RSSI readings per UUID across a scan window, then
 *     pick the strongest known beacon at the end of each window.
 *
 * The return shape is IDENTICAL to the previous react-native-ble-plx
 * version — useLocationDetection.js needs no changes.
 *
 * Requires: react-native-ibeacon
 * Install:  npx expo install react-native-ibeacon
 *
 * iOS: add NSLocationWhenInUseUsageDescription to app.json
 * Android: ACCESS_FINE_LOCATION is required (prompted at runtime below)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Beacons from 'react-native-ibeacon';
import { getAllRooms, getRoomByBeaconId } from '../data/roomContexts';

const SCAN_WINDOW   = 3000;  // ms — accumulate readings for this long
const SCAN_COOLDOWN = 2000;  // ms — pause between windows
const MIN_RSSI      = -80;   // dBm — ignore very weak signals

// ── Permissions ────────────────────────────────────────────────────────
async function requestPermissions() {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled by react-native-ibeacon via
    // CoreLocation. Make sure NSLocationWhenInUseUsageDescription
    // is set in your app.json under expo.ios.infoPlist.
    Beacons.requestWhenInUseAuthorization();
    return true;
  }

  // Android
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

// ── Region helpers ─────────────────────────────────────────────────────
/**
 * Build a region descriptor for react-native-ibeacon from a room.
 * Each unique UUID gets one region. Major/minor are left unset so
 * we range all beacons broadcasting that UUID regardless of their
 * major/minor values.
 */
function roomToRegion(room) {
  return {
    identifier: room.id,
    uuid: room.beaconId.toUpperCase(),
  };
}

/**
 * useBLEScanning
 * --------------
 * @returns {object} {
 *   strongestBeaconId : string | null  — UUID of closest known beacon
 *   isScanning        : boolean
 *   error             : string | null
 *   startScanning     : () => void
 *   stopScanning      : () => void
 * }
 */
export default function useBLEScanning() {
  const [strongestBeaconId, setStrongestBeaconId] = useState(null);
  const [isScanning, setIsScanning]               = useState(false);
  const [error, setError]                         = useState(null);

  const rssiMapRef       = useRef({});
  const scanTimerRef     = useRef(null);
  const cooldownTimerRef = useRef(null);
  const isMountedRef     = useRef(true);
  const regionsRef       = useRef([]);

  // ── Evaluate one scan window ──────────────────────────────────────
  const evaluateScan = useCallback(() => {
    const rssiMap = rssiMapRef.current;
    const ids = Object.keys(rssiMap);

    if (ids.length === 0) {
      console.log('[iBeacon] No beacons heard this window.');
      rssiMapRef.current = {};
      return;
    }

    let bestID   = null;
    let bestRSSI = -Infinity;

    ids.forEach((uuid) => {
      const room = getRoomByBeaconId(uuid);
      if (!room) return;

      const readings = rssiMap[uuid];
      const avgRSSI  = readings.reduce((a, b) => a + b, 0) / readings.length;
      console.log(`[iBeacon] ${room.label} (${uuid}) @ avg ${avgRSSI.toFixed(1)} dBm`);

      if (avgRSSI > bestRSSI) {
        bestRSSI = avgRSSI;
        bestID   = uuid;
      }
    });

    if (bestID && isMountedRef.current) {
      console.log(`[iBeacon] Best beacon: ${bestID} @ ${bestRSSI.toFixed(1)} dBm`);
      setStrongestBeaconId(bestID);
    } else {
      console.log('[iBeacon] No known beacons in range.');
    }

    rssiMapRef.current = {};
  }, []);

  // ── Scan window timer loop ────────────────────────────────────────
  const scheduleNextWindow = useCallback(() => {
    scanTimerRef.current = setTimeout(() => {
      evaluateScan();
      cooldownTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          rssiMapRef.current = {};
          scheduleNextWindow();
        }
      }, SCAN_COOLDOWN);
    }, SCAN_WINDOW);
  }, [evaluateScan]);

  // ── Stop ──────────────────────────────────────────────────────────
  const stopScanning = useCallback(() => {
    clearTimeout(scanTimerRef.current);
    clearTimeout(cooldownTimerRef.current);
    regionsRef.current.forEach((region) => {
      Beacons.stopRangingBeaconsInRegion(region).catch(() => {});
    });
    setIsScanning(false);
    console.log('[iBeacon] Scanning stopped.');
  }, []);

  // ── Start ─────────────────────────────────────────────────────────
  const startScanning = useCallback(async () => {
    setError(null);

    const granted = await requestPermissions();
    if (!granted) {
      setError('Location permission denied — required for beacon ranging.');
      console.warn('[iBeacon] Permissions not granted.');
      return;
    }

    const rooms   = getAllRooms();
    const regions = rooms.map(roomToRegion);
    regionsRef.current = regions;

    console.log(`[iBeacon] Ranging ${regions.length} region(s):`,
      regions.map((r) => `${r.identifier} (${r.uuid})`));

    try {
      await Promise.all(
        regions.map((region) => Beacons.startRangingBeaconsInRegion(region))
      );
    } catch (e) {
      setError(`Failed to start ranging: ${e.message}`);
      console.warn('[iBeacon] startRangingBeaconsInRegion error:', e);
      return;
    }

    setIsScanning(true);
    scheduleNextWindow();
  }, [scheduleNextWindow]);

  // ── Lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    const subscription = Beacons.BeaconsEventEmitter.addListener(
      'beaconsDidRange',
      (data) => {
        if (!data?.beacons) return;

        data.beacons.forEach((beacon) => {
          const uuid = beacon.uuid?.toUpperCase();
          const rssi = beacon.rssi;

          if (!uuid || rssi === undefined || rssi === 0) return;
          if (rssi < MIN_RSSI) return;

          console.log(`[iBeacon] Ranged: ${uuid} rssi=${rssi}`);

          if (!rssiMapRef.current[uuid]) rssiMapRef.current[uuid] = [];
          rssiMapRef.current[uuid].push(rssi);
        });
      }
    );

    startScanning();

    return () => {
      isMountedRef.current = false;
      subscription.remove();
      stopScanning();
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



// /**
//  * useBLEScanning.js
//  * -----------------
//  * Handles all raw Bluetooth Low Energy scanning logic.
//  *
//  * Scans for nearby BLE devices, tracks the strongest RSSI signal
//  * per device ID, and returns the ID of the closest known beacon.
//  *
//  * Beacon ID extraction priority:
//  *   1. iBeacon proximity UUID — parsed from manufacturerData
//  *      (handles BlueCharm Pro and most Apple-format iBeacons)
//  *   2. serviceUUIDs — for Eddystone and other GATT-advertising beacons
//  *   3. device.id — MAC on Android, system UUID on iOS (last resort)
//  *
//  * The ID returned will always be an uppercase UUID string in the form
//  * "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" when parsed from iBeacon data,
//  * so make sure your beaconId values in roomContexts.js match that format.
//  *
//  * This hook does NOT know anything about rooms — it just returns
//  * the winning beacon ID. Room lookup is handled upstream in
//  * useLocationDetection.js.
//  *
//  * Requires: react-native-ble-plx
//  * Install:  npx expo install react-native-ble-plx
//  */

// import { useEffect, useRef, useState, useCallback } from 'react';
// import { BleManager } from 'react-native-ble-plx';
// import { Platform, PermissionsAndroid } from 'react-native';
// import { getRoomByBeaconId } from '../data/roomContexts';

// const SCAN_WINDOW = 7000;   // ms — how long each scan window runs
// const SCAN_COOLDOWN = 3000; // ms — pause between scan windows
// const MIN_RSSI = -80;       // dBm — lower if beacon is weak; raise to filter noise

// // iBeacon manufacturer data constants
// const APPLE_COMPANY_ID_0 = 0x4C; // Apple's Bluetooth company ID, low byte
// const APPLE_COMPANY_ID_1 = 0x00; // high byte
// const IBEACON_TYPE = 0x02;
// const IBEACON_LENGTH = 0x15;     // 21 bytes of iBeacon payload follow

// /**
//  * Request Android BLE permissions at runtime.
//  * iOS permissions are declared in app.json via the plugin config.
//  */
// async function requestAndroidPermissions() {
//   if (Platform.OS !== 'android') return true;

//   if (Platform.Version >= 31) {
//     const results = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//     ]);
//     return Object.values(results).every(
//       (r) => r === PermissionsAndroid.RESULTS.GRANTED
//     );
//   } else {
//     const result = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
//     );
//     return result === PermissionsAndroid.RESULTS.GRANTED;
//   }
// }

// /**
//  * Parse a base64-encoded iBeacon manufacturerData payload and return
//  * the proximity UUID string, or null if the data isn't a valid iBeacon.
//  *
//  * iBeacon manufacturer data layout (25 bytes total):
//  *   [0]     0x4C  — Apple company ID low byte
//  *   [1]     0x00  — Apple company ID high byte
//  *   [2]     0x02  — iBeacon type
//  *   [3]     0x15  — iBeacon payload length (21)
//  *   [4–19]  UUID  — 16-byte proximity UUID
//  *   [20–21] major — 2 bytes big-endian
//  *   [22–23] minor — 2 bytes big-endian
//  *   [24]    TX power
//  *
//  * @param {string | null} base64Data
//  * @returns {string | null} UUID in "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" form
//  */
// function parseIBeaconUUID(base64Data) {
//   if (!base64Data) return null;

//   let bytes;
//   try {
//     const binary = atob(base64Data);
//     bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
//   } catch {
//     return null;
//   }

//   // Minimum length: 4 header bytes + 16 UUID bytes + 2 major + 2 minor + 1 TX = 25
//   if (bytes.length < 25) return null;

//   // Validate Apple company ID and iBeacon type/length markers
//   if (
//     bytes[0] !== APPLE_COMPANY_ID_0 ||
//     bytes[1] !== APPLE_COMPANY_ID_1 ||
//     bytes[2] !== IBEACON_TYPE ||
//     bytes[3] !== IBEACON_LENGTH
//   ) {
//     return null;
//   }

//   // Extract the 16 UUID bytes and format as a standard UUID string
//   const hex = Array.from(bytes.slice(4, 20))
//     .map((b) => b.toString(16).padStart(2, '0'))
//     .join('');

//   const uuid = [
//     hex.slice(0, 8),
//     hex.slice(8, 12),
//     hex.slice(12, 16),
//     hex.slice(16, 20),
//     hex.slice(20, 32),
//   ].join('-').toUpperCase();

//   return uuid;
// }

// /**
//  * Extract candidate beacon identifiers from a scanned BLE device.
//  *
//  * Returns an array so that a single advertisement can contribute
//  * multiple IDs (e.g. both an iBeacon UUID and a service UUID),
//  * all of which get RSSI readings recorded against them. Only the
//  * ones that match a known room in roomContexts will survive evaluation.
//  *
//  * Priority:
//  *   1. iBeacon proximity UUID (from manufacturerData)
//  *   2. serviceUUIDs (Eddystone / GATT-advertising beacons)
//  *   3. device.id (MAC on Android — last resort, avoid if possible)
//  */
// function extractIDs(device) {
//   const ids = [];

//   // 1. Try iBeacon manufacturerData first
//   const iBeaconUUID = parseIBeaconUUID(device.manufacturerData);
//   if (iBeaconUUID) {
//     ids.push(iBeaconUUID);
//     console.log(`[BLE] Parsed iBeacon UUID: ${iBeaconUUID}`);
//   }

//   // 2. serviceUUIDs (Eddystone, or beacons that advertise a GATT service)
//   if (device.serviceUUIDs && device.serviceUUIDs.length > 0) {
//     ids.push(...device.serviceUUIDs);
//   }

//   // 3. Fall back to device.id only if we found nothing else.
//   //    On Android this is the MAC address; on iOS it's a rotating system UUID
//   //    so it's only reliable for Android + non-iBeacon devices.
//   if (ids.length === 0 && device.id) {
//     ids.push(device.id);
//   }

//   return ids;
// }

// /**
//  * useBLEScanning
//  * --------------
//  * @returns {object} {
//  *   strongestBeaconId : string | null  — ID of closest known beacon
//  *   isScanning        : boolean
//  *   error             : string | null
//  *   startScanning     : () => void
//  *   stopScanning      : () => void
//  * }
//  */
// export default function useBLEScanning() {
//   const [strongestBeaconId, setStrongestBeaconId] = useState(null);
//   const [isScanning, setIsScanning] = useState(false);
//   const [error, setError] = useState(null);

//   const managerRef = useRef(null);
//   const rssiMapRef = useRef({});      // { [id: string]: number[] }
//   const loggedIdsRef = useRef(new Set()); // reset each scan window
//   const scanTimerRef = useRef(null);
//   const cooldownTimerRef = useRef(null);
//   const isMountedRef = useRef(true);

//   // ── Evaluate scan window results ───────────────────────────────────
//   // Filters to known beacons only, then picks the strongest by avg RSSI
//   const evaluateScan = useCallback(() => {
//     const rssiMap = rssiMapRef.current;
//     const ids = Object.keys(rssiMap);

//     if (ids.length === 0) {
//       console.log('[BLE] No devices heard this window.');
//       return;
//     }

//     let bestID = null;
//     let bestRSSI = -Infinity;

//     ids.forEach((id) => {
//       const room = getRoomByBeaconId(id);
//       if (!room) return; // ignore unknown devices

//       const readings = rssiMap[id];
//       const avgRSSI = readings.reduce((a, b) => a + b, 0) / readings.length;
//       console.log(`[BLE] Known beacon: ${room.label} (${id}) @ avg RSSI ${avgRSSI.toFixed(1)} dBm`);

//       if (avgRSSI > bestRSSI) {
//         bestRSSI = avgRSSI;
//         bestID = id;
//       }
//     });

//     if (bestID) {
//       console.log(`[BLE] Best known beacon: ${bestID} @ ${bestRSSI.toFixed(1)} dBm`);
//       if (isMountedRef.current) setStrongestBeaconId(bestID);
//     } else {
//       console.log('[BLE] No known beacons in range.');
//     }

//     rssiMapRef.current = {};
//   }, []);

//   // ── Core scan cycle ────────────────────────────────────────────────
//   const runScanCycle = useCallback(async () => {
//     const manager = managerRef.current;
//     if (!manager) return;

//     rssiMapRef.current = {};
//     loggedIdsRef.current = new Set();
//     setIsScanning(true);
//     console.log('[BLE] Starting scan window...');

//     //manager.startDeviceScan(null, null, (scanError, device) => {
//     manager.startDeviceScan(null, { allowDuplicates: true, scanMode: 2 }, (scanError, device) => {
//       if (scanError) {
//         console.warn('[BLE] Scan error:', scanError.message);
//         setError(scanError.message);
//         return;
//       }

//       if (!device || device.rssi === null) return;
//       if (device.rssi < MIN_RSSI) return;

//       // Log each unique device once per scan window
//       if (!loggedIdsRef.current.has(device.id)) {
//         loggedIdsRef.current.add(device.id);
//         console.log(`[BLE] Device: ${JSON.stringify({
//           id: device.id,
//           name: device.localName,
//           serviceUUIDs: device.serviceUUIDs,
//           manufacturerData: device.manufacturerData,
//           rssi: device.rssi,
//         })}`);
//       }

//       const ids = extractIDs(device);
//       ids.forEach((id) => {
//         if (!rssiMapRef.current[id]) rssiMapRef.current[id] = [];
//         rssiMapRef.current[id].push(device.rssi);
//       });
//     });

//     // After scan window ends, evaluate and schedule next cycle
//     scanTimerRef.current = setTimeout(() => {
//       manager.stopDeviceScan();
//       setIsScanning(false);
//       evaluateScan();

//       cooldownTimerRef.current = setTimeout(() => {
//         if (isMountedRef.current) runScanCycle();
//       }, SCAN_COOLDOWN);
//     }, SCAN_WINDOW);
//   }, [evaluateScan]);

//   // ── Public controls ────────────────────────────────────────────────
//   const stopScanning = useCallback(() => {
//     clearTimeout(scanTimerRef.current);
//     clearTimeout(cooldownTimerRef.current);
//     managerRef.current?.stopDeviceScan();
//     setIsScanning(false);
//     console.log('[BLE] Scanning stopped.');
//   }, []);

//   const startScanning = useCallback(async () => {
//     setError(null);
//     const hasPermission = await requestAndroidPermissions();
//     if (!hasPermission) {
//       setError('Bluetooth permissions denied.');
//       console.warn('[BLE] Permissions not granted.');
//       return;
//     }
//     runScanCycle();
//   }, [runScanCycle]);

//   // ── Lifecycle ──────────────────────────────────────────────────────
//   useEffect(() => {
//     isMountedRef.current = true;
//     managerRef.current = new BleManager();

//     const subscription = managerRef.current.onStateChange((state) => {
//       console.log(`[BLE] Adapter state: ${state}`);
//       if (state === 'PoweredOn') {
//         subscription.remove();
//         startScanning();
//       } else if (state === 'PoweredOff') {
//         setError('Bluetooth is turned off. Please enable it.');
//         stopScanning();
//       } else if (state === 'Unauthorized') {
//         setError('Bluetooth permission not granted.');
//       }
//     }, true);

//     return () => {
//       isMountedRef.current = false;
//       subscription.remove();
//       stopScanning();
//       managerRef.current?.destroy();
//     };
//   }, [startScanning, stopScanning]);

//   return {
//     strongestBeaconId,
//     isScanning,
//     error,
//     startScanning,
//     stopScanning,
//   };
// }