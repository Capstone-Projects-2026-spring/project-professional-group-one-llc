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
import { getRoomByBeaconId } from '../data/roomContexts';

// How long each scan window runs before we evaluate results (ms) //3000
const SCAN_WINDOW = 3000;

// Minimum RSSI to consider a beacon (filters out distant noise)
// RSSI is negative — closer to 0 means stronger signal
// -80 is a reasonable cutoff; tune this based on your environment //-80
const MIN_RSSI = -150;

// How long to wait between scan windows (ms) — prevents BLE stack spam //2000
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

    let bestUUID = null;
    let bestRSSI = -Infinity;

    uuids.forEach((uuid) => {
      // Only consider known beacons
      const room = getRoomByBeaconId(uuid);
      if (!room) return;

      const readings = rssiMap[uuid];
      const avgRSSI = readings.reduce((a, b) => a + b, 0) / readings.length;

      console.log(`[BLE] Known beacon: ${room.label} @ avg RSSI ${avgRSSI.toFixed(1)} dBm`);

      if (avgRSSI > bestRSSI) {
        bestRSSI = avgRSSI;
        bestUUID = uuid;
      }
    });

  if (bestUUID) {
    console.log(`[BLE] Best known beacon: ${bestUUID} @ ${bestRSSI.toFixed(1)} dBm`);
    if (isMountedRef.current) setStrongestBeaconId(bestUUID);
  } else {
    console.log('[BLE] No known beacons in range.');
  }

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
    // manager.startDeviceScan(null, null, (scanError, device) => {
    //manager.startDeviceScan(null, { allowDuplicates: true }, (scanError, device) => {
    manager.startDeviceScan(null, { scanMode: 2, callbackType: 1 }, (scanError, device) => {
      if (scanError) {
        console.warn('[BLE] Scan error:', scanError.message);
        setError(scanError.message);
        return;
      }

      if (!device || device.rssi === null) return;

      // console.log(`[BLE] Device: ${JSON.stringify({
      //   id: device.id,
      //   name: device.localName,
      //   serviceUUIDs: device.serviceUUIDs,
      //   manufacturerData: device.manufacturerData,
      //   rssi: device.rssi,
      // })}`);

      // Filter out weak signals
      if (device.rssi < MIN_RSSI) return;

      // Collect all UUIDs this device is advertising
      const uuids = extractUUIDs(device);

      uuids.forEach((uuid) => {
        if (!rssiMapRef.current[uuid]) {
          rssiMapRef.current[uuid] = [];
        }
        rssiMapRef.current[uuid].push(device.rssi);
        if (uuid.toUpperCase().startsWith('D')) {
          console.log(`[BLE] Heard: ${uuid} RSSI: ${device.rssi} dBm`);
        }
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

//=====================================================================================================================//

// /**
//  * useBLEScanning.js
//  * -----------------
//  * Handles iBeacon ranging using react-native-ibeacon.
//  *
//  * Unlike react-native-ble-plx, react-native-ibeacon uses the native
//  * iBeacon APIs on both platforms (CoreLocation on iOS, AltBeacon on
//  * Android) which correctly parse iBeacon manufacturer data. This is
//  * necessary because Android 12+ strips Apple manufacturer data from
//  * generic BLE scan results before they reach userspace libraries.
//  *
//  * How it works:
//  *   - You register every known beacon UUID from roomContexts.js as a
//  *     "region" to range for. The library calls back with RSSI whenever
//  *     a beacon matching that UUID is in range.
//  *   - We accumulate RSSI readings per UUID across a scan window, then
//  *     pick the strongest known beacon at the end of each window.
//  *
//  * The return shape is IDENTICAL to the previous react-native-ble-plx
//  * version — useLocationDetection.js needs no changes.
//  *
//  * Requires: react-native-ibeacon
//  * Install:  npx expo install react-native-ibeacon
//  *
//  * iOS: add NSLocationWhenInUseUsageDescription to app.json
//  * Android: ACCESS_FINE_LOCATION is required (prompted at runtime below)
//  */

// import { useEffect, useRef, useState, useCallback } from 'react';
// import { Platform, PermissionsAndroid } from 'react-native';
// import Beacons from 'react-native-ibeacon';
// import { getAllRooms, getRoomByBeaconId } from '../data/roomContexts';

// const SCAN_WINDOW   = 3000;  // ms — accumulate readings for this long
// const SCAN_COOLDOWN = 2000;  // ms — pause between windows
// const MIN_RSSI      = -80;   // dBm — ignore very weak signals

// // ── Permissions ────────────────────────────────────────────────────────
// async function requestPermissions() {
//   if (Platform.OS === 'ios') {
//     // iOS permissions are handled by react-native-ibeacon via
//     // CoreLocation. Make sure NSLocationWhenInUseUsageDescription
//     // is set in your app.json under expo.ios.infoPlist.
//     Beacons.requestWhenInUseAuthorization();
//     return true;
//   }

//   // Android
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

// // ── Region helpers ─────────────────────────────────────────────────────
// /**
//  * Build a region descriptor for react-native-ibeacon from a room.
//  * Each unique UUID gets one region. Major/minor are left unset so
//  * we range all beacons broadcasting that UUID regardless of their
//  * major/minor values.
//  */
// function roomToRegion(room) {
//   return {
//     identifier: room.id,
//     uuid: room.beaconId.toUpperCase(),
//   };
// }

// /**
//  * useBLEScanning
//  * --------------
//  * @returns {object} {
//  *   strongestBeaconId : string | null  — UUID of closest known beacon
//  *   isScanning        : boolean
//  *   error             : string | null
//  *   startScanning     : () => void
//  *   stopScanning      : () => void
//  * }
//  */
// export default function useBLEScanning() {
//   const [strongestBeaconId, setStrongestBeaconId] = useState(null);
//   const [isScanning, setIsScanning]               = useState(false);
//   const [error, setError]                         = useState(null);

//   const rssiMapRef       = useRef({});
//   const scanTimerRef     = useRef(null);
//   const cooldownTimerRef = useRef(null);
//   const isMountedRef     = useRef(true);
//   const regionsRef       = useRef([]);

//   // ── Evaluate one scan window ──────────────────────────────────────
//   const evaluateScan = useCallback(() => {
//     const rssiMap = rssiMapRef.current;
//     const ids = Object.keys(rssiMap);

//     if (ids.length === 0) {
//       console.log('[iBeacon] No beacons heard this window.');
//       rssiMapRef.current = {};
//       return;
//     }

//     let bestID   = null;
//     let bestRSSI = -Infinity;

//     ids.forEach((uuid) => {
//       const room = getRoomByBeaconId(uuid);
//       if (!room) return;

//       const readings = rssiMap[uuid];
//       const avgRSSI  = readings.reduce((a, b) => a + b, 0) / readings.length;
//       console.log(`[iBeacon] ${room.label} (${uuid}) @ avg ${avgRSSI.toFixed(1)} dBm`);

//       if (avgRSSI > bestRSSI) {
//         bestRSSI = avgRSSI;
//         bestID   = uuid;
//       }
//     });

//     if (bestID && isMountedRef.current) {
//       console.log(`[iBeacon] Best beacon: ${bestID} @ ${bestRSSI.toFixed(1)} dBm`);
//       setStrongestBeaconId(bestID);
//     } else {
//       console.log('[iBeacon] No known beacons in range.');
//     }

//     rssiMapRef.current = {};
//   }, []);

//   // ── Scan window timer loop ────────────────────────────────────────
//   const scheduleNextWindow = useCallback(() => {
//     scanTimerRef.current = setTimeout(() => {
//       evaluateScan();
//       cooldownTimerRef.current = setTimeout(() => {
//         if (isMountedRef.current) {
//           rssiMapRef.current = {};
//           scheduleNextWindow();
//         }
//       }, SCAN_COOLDOWN);
//     }, SCAN_WINDOW);
//   }, [evaluateScan]);

//   // ── Stop ──────────────────────────────────────────────────────────
//   const stopScanning = useCallback(() => {
//     clearTimeout(scanTimerRef.current);
//     clearTimeout(cooldownTimerRef.current);
//     regionsRef.current.forEach((region) => {
//       Beacons.stopRangingBeaconsInRegion(region).catch(() => {});
//     });
//     setIsScanning(false);
//     console.log('[iBeacon] Scanning stopped.');
//   }, []);

//   // ── Start ─────────────────────────────────────────────────────────
//   const startScanning = useCallback(async () => {
//     setError(null);

//     const granted = await requestPermissions();
//     if (!granted) {
//       setError('Location permission denied — required for beacon ranging.');
//       console.warn('[iBeacon] Permissions not granted.');
//       return;
//     }

//     const rooms   = getAllRooms();
//     const regions = rooms.map(roomToRegion);
//     regionsRef.current = regions;

//     console.log(`[iBeacon] Ranging ${regions.length} region(s):`,
//       regions.map((r) => `${r.identifier} (${r.uuid})`));

//     try {
//       await Promise.all(
//         regions.map((region) => Beacons.startRangingBeaconsInRegion(region))
//       );
//     } catch (e) {
//       setError(`Failed to start ranging: ${e.message}`);
//       console.warn('[iBeacon] startRangingBeaconsInRegion error:', e);
//       return;
//     }

//     setIsScanning(true);
//     scheduleNextWindow();
//   }, [scheduleNextWindow]);

//   // ── Lifecycle ─────────────────────────────────────────────────────
//   useEffect(() => {
//     isMountedRef.current = true;

//     const subscription = Beacons.BeaconsEventEmitter.addListener(
//       'beaconsDidRange',
//       (data) => {
//         if (!data?.beacons) return;

//         data.beacons.forEach((beacon) => {
//           const uuid = beacon.uuid?.toUpperCase();
//           const rssi = beacon.rssi;

//           if (!uuid || rssi === undefined || rssi === 0) return;
//           if (rssi < MIN_RSSI) return;

//           console.log(`[iBeacon] Ranged: ${uuid} rssi=${rssi}`);

//           if (!rssiMapRef.current[uuid]) rssiMapRef.current[uuid] = [];
//           rssiMapRef.current[uuid].push(rssi);
//         });
//       }
//     );

//     startScanning();

//     return () => {
//       isMountedRef.current = false;
//       subscription.remove();
//       stopScanning();
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

//===================================================================================================================================//

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

// ============================================================================================================================================================ //

/**
 * useBLEScanning.js
 * -----------------
 * Handles BLE scanning and iBeacon UUID detection.
 *
 * WHY THIS APPROACH
 * -----------------
 * Android 12+ deliberately strips Apple manufacturer data from BLE
 * scan results before they reach userspace. This means:
 *   - device.manufacturerData  → always null for iBeacons on Android 12+
 *   - react-native-ibeacon     → uses the same userspace path, same problem
 *
 * The fix: Android still delivers the complete raw advertisement bytes in
 * device.rawScanRecord (a base64-encoded blob). We decode it ourselves,
 * walk the AD structure, find the Manufacturer Specific Data AD type (0xFF),
 * and parse the iBeacon UUID from the Apple payload inside it.
 *
 * This gives us the same UUID that apps using privileged system APIs see.
 *
 * LOGGING
 * -------
 * Every unique device seen per scan window is logged in full detail:
 *   - device.id, name, RSSI, txPowerLevel
 *   - serviceUUIDs, serviceData
 *   - manufacturerData (usually null on Android 12+ for iBeacons)
 *   - rawScanRecord (base64)
 *   - parsed iBeacon UUID if successfully extracted from rawScanRecord
 *   - all AD structures found in rawScanRecord (type + hex payload)
 *
 * HOW THE SCAN CYCLE WORKS
 * ------------------------
 *   1. Start a scan window (SCAN_WINDOW ms), allowDuplicates: true
 *   2. Accumulate RSSI readings per beacon ID
 *   3. At end of window: average RSSI per ID, pick strongest known beacon
 *   4. Cooldown (SCAN_COOLDOWN ms), then repeat
 *
 * RETURN SHAPE (identical to previous versions — no upstream changes needed)
 * --------------------------------------------------------------------------
 * {
 *   strongestBeaconId : string | null
 *   isScanning        : boolean
 *   error             : string | null
 *   startScanning     : () => void
 *   stopScanning      : () => void
 * }
 *
 * Requires: react-native-ble-plx
 * Install:  npx expo install react-native-ble-plx
 */

// import { useEffect, useRef, useState, useCallback } from 'react';
// import { BleManager } from 'react-native-ble-plx';
// import { Platform, PermissionsAndroid } from 'react-native';
// import { getRoomByBeaconId } from '../data/roomContexts';

// // ── Tuning constants ────────────────────────────────────────────────────────

// const SCAN_WINDOW   = 4000;  // ms — accumulate readings for this long
// const SCAN_COOLDOWN = 2000;  // ms — pause between windows
// const MIN_RSSI      = -100;  // dBm — ignore very weak signals (tune as needed)

// // ── iBeacon AD-structure constants ──────────────────────────────────────────

// const AD_TYPE_MANUFACTURER = 0xFF; // Manufacturer Specific Data
// const APPLE_COMPANY_ID_LO  = 0x4C; // Apple's Bluetooth SIG company ID
// const APPLE_COMPANY_ID_HI  = 0x00;
// const IBEACON_SUBTYPE      = 0x02; // iBeacon subtype byte
// const IBEACON_LENGTH       = 0x15; // 21 bytes follow (UUID + major + minor + tx)

// // ── Permissions ─────────────────────────────────────────────────────────────

// async function requestPermissions() {
//   if (Platform.OS !== 'android') return true;

//   if (Platform.Version >= 31) {
//     const results = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//     ]);
//     return Object.values(results).every(
//       r => r === PermissionsAndroid.RESULTS.GRANTED
//     );
//   }

//   const result = await PermissionsAndroid.request(
//     PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
//   );
//   return result === PermissionsAndroid.RESULTS.GRANTED;
// }

// // ── rawScanRecord parser ─────────────────────────────────────────────────────

// /**
//  * Decode a base64 rawScanRecord into an array of AD structures.
//  *
//  * AD structure format:
//  *   [length: 1 byte] [type: 1 byte] [payload: length-1 bytes]
//  *
//  * Returns array of { type: number, payload: Uint8Array, hex: string }
//  * Returns empty array on any decode failure.
//  */
// function parseAdStructures(base64) {
//   if (!base64) return [];

//   let bytes;
//   try {
//     const binary = atob(base64);
//     bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
//   } catch {
//     return [];
//   }

//   const structures = [];
//   let i = 0;

//   while (i < bytes.length) {
//     const length = bytes[i];
//     if (length === 0) break; // zero-length AD = end of record
//     if (i + length >= bytes.length) break; // truncated

//     const type    = bytes[i + 1];
//     const payload = bytes.slice(i + 2, i + 1 + length);
//     const hex     = Array.from(payload)
//       .map(b => b.toString(16).padStart(2, '0'))
//       .join(' ');

//     structures.push({ type, payload, hex });
//     i += 1 + length;
//   }

//   return structures;
// }

// /**
//  * Search parsed AD structures for an Apple iBeacon manufacturer payload
//  * and return the proximity UUID, or null if not found.
//  *
//  * iBeacon manufacturer payload layout (inside AD type 0xFF):
//  *   [0]    0x4C  — Apple company ID lo
//  *   [1]    0x00  — Apple company ID hi
//  *   [2]    0x02  — iBeacon subtype
//  *   [3]    0x15  — payload length (21)
//  *   [4–19] UUID  — 16 bytes
//  *   [20–21] major (big-endian)
//  *   [22–23] minor (big-endian)
//  *   [24]   TX power
//  */
// function extractIBeaconUUID(adStructures) {
//   for (const ad of adStructures) {
//     if (ad.type !== AD_TYPE_MANUFACTURER) continue;
//     const p = ad.payload;

//     if (p.length < 25) continue;
//     if (p[0] !== APPLE_COMPANY_ID_LO) continue;
//     if (p[1] !== APPLE_COMPANY_ID_HI) continue;
//     if (p[2] !== IBEACON_SUBTYPE)     continue;
//     if (p[3] !== IBEACON_LENGTH)      continue;

//     const hex = Array.from(p.slice(4, 20))
//       .map(b => b.toString(16).padStart(2, '0'))
//       .join('');

//     const uuid = [
//       hex.slice(0,  8),
//       hex.slice(8,  12),
//       hex.slice(12, 16),
//       hex.slice(16, 20),
//       hex.slice(20, 32),
//     ].join('-').toUpperCase();

//     return uuid;
//   }

//   return null;
// }

// /**
//  * Extract the major, minor, and TX power from the iBeacon AD payload.
//  * Returns null if no valid iBeacon payload found.
//  */
// function extractIBeaconMeta(adStructures) {
//   for (const ad of adStructures) {
//     if (ad.type !== AD_TYPE_MANUFACTURER) continue;
//     const p = ad.payload;

//     if (p.length < 25) continue;
//     if (p[0] !== APPLE_COMPANY_ID_LO) continue;
//     if (p[1] !== APPLE_COMPANY_ID_HI) continue;
//     if (p[2] !== IBEACON_SUBTYPE)     continue;
//     if (p[3] !== IBEACON_LENGTH)      continue;

//     return {
//       major:   (p[20] << 8) | p[21],
//       minor:   (p[22] << 8) | p[23],
//       txPower: p[24] > 127 ? p[24] - 256 : p[24], // signed byte
//     };
//   }

//   return null;
// }

// // ── Device ID extraction ─────────────────────────────────────────────────────

// /**
//  * Determine the best beacon ID to use for a scanned device.
//  *
//  * Priority:
//  *   1. iBeacon UUID parsed from rawScanRecord  (Android 12+ path)
//  *   2. iBeacon UUID from manufacturerData      (iOS / older Android)
//  *   3. serviceUUIDs[0]                         (Eddystone / GATT beacons)
//  *   4. device.id                               (last resort — MAC on Android)
//  *
//  * Returns { id: string, source: string } so logs can show how we got the ID.
//  */
// function extractBeaconId(device, adStructures) {
//   // 1. rawScanRecord iBeacon UUID
//   const rawUUID = extractIBeaconUUID(adStructures);
//   if (rawUUID) return { id: rawUUID, source: 'rawScanRecord/iBeacon' };

//   // 2. manufacturerData iBeacon UUID (iOS, older Android)
//   if (device.manufacturerData) {
//     let bytes;
//     try {
//       const binary = atob(device.manufacturerData);
//       bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
//     } catch { /* ignore */ }

//     if (bytes && bytes.length >= 25 &&
//         bytes[0] === APPLE_COMPANY_ID_LO &&
//         bytes[1] === APPLE_COMPANY_ID_HI &&
//         bytes[2] === IBEACON_SUBTYPE     &&
//         bytes[3] === IBEACON_LENGTH) {
//       const hex = Array.from(bytes.slice(4, 20))
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('');
//       const uuid = [
//         hex.slice(0,  8),
//         hex.slice(8,  12),
//         hex.slice(12, 16),
//         hex.slice(16, 20),
//         hex.slice(20, 32),
//       ].join('-').toUpperCase();
//       return { id: uuid, source: 'manufacturerData/iBeacon' };
//     }
//   }

//   // 3. serviceUUIDs
//   if (device.serviceUUIDs?.length > 0) {
//     return { id: device.serviceUUIDs[0].toUpperCase(), source: 'serviceUUIDs' };
//   }

//   // 4. device.id
//   return { id: device.id, source: 'device.id' };
// }

// // ── Verbose device logger ────────────────────────────────────────────────────

// /**
//  * Log everything we know about a device once per scan window.
//  * This is the "I want as much info as possible" logger.
//  */
// function logDevice(device, adStructures) {
//   const iBeaconUUID = extractIBeaconUUID(adStructures);
//   const iBeaconMeta = iBeaconUUID ? extractIBeaconMeta(adStructures) : null;
//   const room        = iBeaconUUID ? getRoomByBeaconId(iBeaconUUID) : null;

//   console.log(
//     '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
//     `[BLE] Device spotted\n` +
//     `  id            : ${device.id}\n` +
//     `  name          : ${device.localName ?? device.name ?? '(none)'}\n` +
//     `  rssi          : ${device.rssi} dBm\n` +
//     `  txPowerLevel  : ${device.txPowerLevel ?? '(none)'}\n` +
//     `  serviceUUIDs  : ${JSON.stringify(device.serviceUUIDs ?? [])}\n` +
//     `  serviceData   : ${JSON.stringify(device.serviceData ?? {})}\n` +
//     `  mfrData(raw)  : ${device.manufacturerData ?? '(null — expected on Android 12+)'}\n` +
//     `  rawScanRecord : ${device.rawScanRecord ?? '(null)'}\n` +
//     `  AD structures : ${
//       adStructures.length === 0
//         ? '(none parsed)'
//         : adStructures.map(a => `\n    type=0x${a.type.toString(16).padStart(2,'0')} [${a.hex}]`).join('')
//     }\n` +
//     (iBeaconUUID
//       ? `  ✅ iBeacon UUID : ${iBeaconUUID}\n` +
//         `     major=${iBeaconMeta?.major}  minor=${iBeaconMeta?.minor}  tx=${iBeaconMeta?.txPower} dBm\n` +
//         `     room match    : ${room ? `✅ ${room.label}` : '❌ no match in roomContexts'}\n`
//       : `  ℹ️  No iBeacon UUID found in AD structures\n`) +
//     '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
//   );
// }

// // ── Hook ─────────────────────────────────────────────────────────────────────

// export default function useBLEScanning() {
//   const [strongestBeaconId, setStrongestBeaconId] = useState(null);
//   const [isScanning, setIsScanning]               = useState(false);
//   const [error, setError]                         = useState(null);

//   const managerRef       = useRef(null);
//   const rssiMapRef       = useRef({});           // { [beaconId]: number[] }
//   const loggedIdsRef     = useRef(new Set());    // device.id seen this window
//   const scanTimerRef     = useRef(null);
//   const cooldownTimerRef = useRef(null);
//   const isMountedRef     = useRef(true);

//   // ── Evaluate one scan window ──────────────────────────────────────
//   const evaluateScan = useCallback(() => {
//     const rssiMap = rssiMapRef.current;
//     const ids     = Object.keys(rssiMap);

//     console.log(`\n[BLE] ── Scan window complete — ${ids.length} unique beacon ID(s) heard ──`);

//     if (ids.length === 0) {
//       console.log('[BLE] No devices heard this window.');
//       rssiMapRef.current = {};
//       return;
//     }

//     let bestId   = null;
//     let bestRSSI = -Infinity;

//     ids.forEach(id => {
//       const readings = rssiMap[id];
//       const avgRSSI  = readings.reduce((a, b) => a + b, 0) / readings.length;
//       const room     = getRoomByBeaconId(id);

//       console.log(
//         `[BLE] ${room ? `✅ KNOWN   ${room.label}` : '❓ UNKNOWN'} ` +
//         `| id=${id} | avg=${avgRSSI.toFixed(1)} dBm | n=${readings.length}`
//       );

//       if (room && avgRSSI > bestRSSI) {
//         bestRSSI = avgRSSI;
//         bestId   = id;
//       }
//     });

//     if (bestId) {
//       const room = getRoomByBeaconId(bestId);
//       console.log(`[BLE] 🏆 Best known beacon: ${room.label} (${bestId}) @ ${bestRSSI.toFixed(1)} dBm`);
//       if (isMountedRef.current) setStrongestBeaconId(bestId);
//     } else {
//       console.log('[BLE] No known beacons found this window. Check roomContexts beaconId values.');
//     }

//     rssiMapRef.current = {};
//   }, []);

//   // ── Scan cycle ────────────────────────────────────────────────────
//   const runScanCycle = useCallback(async () => {
//     const manager = managerRef.current;
//     if (!manager) return;

//     rssiMapRef.current  = {};
//     loggedIdsRef.current = new Set();
//     setIsScanning(true);

//     console.log('\n[BLE] ══ Starting scan window ══');

//     manager.startDeviceScan(
//       null,
//       {
//         allowDuplicates: true,
//         scanMode: 2,        // SCAN_MODE_LOW_LATENCY — fastest update rate
//       },
//       (scanError, device) => {
//         if (scanError) {
//           console.warn('[BLE] Scan error:', scanError.message);
//           setError(scanError.message);
//           return;
//         }

//         if (!device || device.rssi === null || device.rssi === 0) return;
//         if (device.rssi < MIN_RSSI) return;

//         // Parse raw scan record regardless of whether we log
//         const adStructures = parseAdStructures(device.rawScanRecord);

//         // Log each device once per scan window (keyed on device.id)
//         if (!loggedIdsRef.current.has(device.id)) {
//           loggedIdsRef.current.add(device.id);
//           logDevice(device, adStructures);
//         }

//         // Extract the best available beacon ID for this device
//         const { id: beaconId, source } = extractBeaconId(device, adStructures);

//         if (!rssiMapRef.current[beaconId]) {
//           rssiMapRef.current[beaconId] = [];
//           // Log first time we start accumulating for a new ID this window
//           console.log(`[BLE] Accumulating RSSI for ${beaconId} (via ${source})`);
//         }
//         rssiMapRef.current[beaconId].push(device.rssi);
//       }
//     );

//     scanTimerRef.current = setTimeout(() => {
//       manager.stopDeviceScan();
//       setIsScanning(false);
//       evaluateScan();

//       cooldownTimerRef.current = setTimeout(() => {
//         if (isMountedRef.current) runScanCycle();
//       }, SCAN_COOLDOWN);
//     }, SCAN_WINDOW);
//   }, [evaluateScan]);

//   // ── Public controls ───────────────────────────────────────────────
//   const stopScanning = useCallback(() => {
//     clearTimeout(scanTimerRef.current);
//     clearTimeout(cooldownTimerRef.current);
//     managerRef.current?.stopDeviceScan();
//     setIsScanning(false);
//     console.log('[BLE] Scanning stopped.');
//   }, []);

//   const startScanning = useCallback(async () => {
//     setError(null);

//     const granted = await requestPermissions();
//     if (!granted) {
//       setError('Bluetooth/location permissions denied.');
//       console.warn('[BLE] Permissions not granted.');
//       return;
//     }

//     runScanCycle();
//   }, [runScanCycle]);

//   // ── Lifecycle ─────────────────────────────────────────────────────
//   useEffect(() => {
//     isMountedRef.current = true;
//     managerRef.current   = new BleManager();

//     const subscription = managerRef.current.onStateChange(state => {
//       console.log(`[BLE] Adapter state: ${state}`);

//       if (state === 'PoweredOn') {
//         subscription.remove();
//         startScanning();
//       } else if (state === 'PoweredOff') {
//         setError('Bluetooth is off. Please enable it.');
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

// ================================================================================================================ //

// /**
//  * useBLEScanning.js
//  * -----------------
//  * Continuous BLE scan with periodic RSSI evaluation.
//  *
//  * WHY CONTINUOUS SCAN
//  * -------------------
//  * Android 8.0+ enforces a hard limit of 5 scan start/stop cycles per
//  * 30 seconds per app. Exceeding this causes Android to silently apply
//  * aggressive result filtering — new or infrequently-seen devices stop
//  * appearing entirely, with no error. This is why beacons would vanish
//  * while cached devices (Govee lights, phones) kept showing up.
//  *
//  * The fix: start one scan when the component mounts and never stop it
//  * until unmount. RSSI accumulation and evaluation still happen on a
//  * timer — we just don't touch the BLE scan itself between cycles.
//  *
//  * WHY rawScanRecord PARSING
//  * -------------------------
//  * Android 12+ strips Apple manufacturer data from BLE scan results
//  * before they reach userspace. device.manufacturerData is null for
//  * iBeacons on Android 12+. The complete raw advertisement bytes are
//  * still present in device.rawScanRecord (base64). We decode that
//  * ourselves, walk the AD structure, and extract the iBeacon UUID.
//  *
//  * SCAN ARCHITECTURE
//  * -----------------
//  *   - One continuous scan for the component lifetime
//  *   - Every EVAL_INTERVAL ms: average RSSI per beacon, pick strongest
//  *     known beacon, clear accumulator, repeat
//  *   - allowDuplicates: true so we get continuous RSSI updates
//  *   - scanMode: 2 (LOW_LATENCY) for fastest possible updates
//  *
//  * LOGGING
//  * -------
//  * Every unique device.id seen since the last eval is logged once with:
//  *   - id, name, RSSI, txPowerLevel
//  *   - serviceUUIDs, serviceData
//  *   - manufacturerData (null on Android 12+ for iBeacons — expected)
//  *   - rawScanRecord (base64)
//  *   - every AD structure found (type + hex payload)
//  *   - parsed iBeacon UUID + major/minor/tx if found
//  *   - whether it matches a known room in roomContexts
//  *
//  * RETURN SHAPE (identical to all previous versions)
//  * -------------------------------------------------
//  * {
//  *   strongestBeaconId : string | null
//  *   isScanning        : boolean
//  *   error             : string | null
//  *   startScanning     : () => void
//  *   stopScanning      : () => void
//  * }
//  */

// import { useEffect, useRef, useState, useCallback } from 'react';
// import { BleManager } from 'react-native-ble-plx';
// import { Platform, PermissionsAndroid } from 'react-native';
// import { getRoomByBeaconId } from '../data/roomContexts';

// // ── Tuning ───────────────────────────────────────────────────────────────────

// const EVAL_INTERVAL = 3000;  // ms — how often to evaluate accumulated RSSI
// const MIN_RSSI      = -100;  // dBm — ignore very weak signals

// // ── iBeacon AD constants ─────────────────────────────────────────────────────

// const AD_TYPE_MANUFACTURER = 0xFF;
// const APPLE_COMPANY_ID_LO  = 0x4C;
// const APPLE_COMPANY_ID_HI  = 0x00;
// const IBEACON_SUBTYPE      = 0x02;
// const IBEACON_LENGTH       = 0x15; // 21 bytes: 16 UUID + 2 major + 2 minor + 1 tx

// // ── Permissions ──────────────────────────────────────────────────────────────

// async function requestPermissions() {
//   if (Platform.OS !== 'android') return true;

//   if (Platform.Version >= 31) {
//     const results = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//     ]);
//     return Object.values(results).every(
//       r => r === PermissionsAndroid.RESULTS.GRANTED
//     );
//   }

//   const result = await PermissionsAndroid.request(
//     PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
//   );
//   return result === PermissionsAndroid.RESULTS.GRANTED;
// }

// // ── AD structure parser ──────────────────────────────────────────────────────

// /**
//  * Walk a base64 rawScanRecord and return all AD structures found.
//  * Returns [] on any failure.
//  */
// function parseAdStructures(base64) {
//   if (!base64) return [];

//   let bytes;
//   try {
//     const binary = atob(base64);
//     bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
//   } catch {
//     return [];
//   }

//   const structures = [];
//   let i = 0;

//   while (i < bytes.length) {
//     const length = bytes[i];
//     if (length === 0) break;
//     if (i + length >= bytes.length) break;

//     const type    = bytes[i + 1];
//     const payload = bytes.slice(i + 2, i + 1 + length);
//     const hex     = Array.from(payload)
//       .map(b => b.toString(16).padStart(2, '0'))
//       .join(' ');

//     structures.push({ type, payload, hex });
//     i += 1 + length;
//   }

//   return structures;
// }

// /**
//  * Search AD structures for an Apple iBeacon manufacturer payload.
//  * Returns the proximity UUID string or null.
//  */
// function extractIBeaconUUID(adStructures) {
//   for (const ad of adStructures) {
//     if (ad.type !== AD_TYPE_MANUFACTURER) continue;
//     const p = ad.payload;

//     if (p.length < 25)                continue;
//     if (p[0] !== APPLE_COMPANY_ID_LO) continue;
//     if (p[1] !== APPLE_COMPANY_ID_HI) continue;
//     if (p[2] !== IBEACON_SUBTYPE)     continue;
//     if (p[3] !== IBEACON_LENGTH)      continue;

//     const hex = Array.from(p.slice(4, 20))
//       .map(b => b.toString(16).padStart(2, '0'))
//       .join('');

//     return [
//       hex.slice(0,  8),
//       hex.slice(8,  12),
//       hex.slice(12, 16),
//       hex.slice(16, 20),
//       hex.slice(20, 32),
//     ].join('-').toUpperCase();
//   }
//   return null;
// }

// /**
//  * Extract major, minor, txPower from iBeacon AD payload.
//  * Returns null if no valid iBeacon payload found.
//  */
// function extractIBeaconMeta(adStructures) {
//   for (const ad of adStructures) {
//     if (ad.type !== AD_TYPE_MANUFACTURER) continue;
//     const p = ad.payload;

//     if (p.length < 25)                continue;
//     if (p[0] !== APPLE_COMPANY_ID_LO) continue;
//     if (p[1] !== APPLE_COMPANY_ID_HI) continue;
//     if (p[2] !== IBEACON_SUBTYPE)     continue;
//     if (p[3] !== IBEACON_LENGTH)      continue;

//     return {
//       major:   (p[20] << 8) | p[21],
//       minor:   (p[22] << 8) | p[23],
//       txPower: p[24] > 127 ? p[24] - 256 : p[24],
//     };
//   }
//   return null;
// }

// // ── Beacon ID extraction ─────────────────────────────────────────────────────

// /**
//  * Determine the best beacon ID for a scanned device.
//  * Priority:
//  *   1. iBeacon UUID from rawScanRecord  (Android 12+ path)
//  *   2. iBeacon UUID from manufacturerData (iOS / older Android)
//  *   3. serviceUUIDs[0]
//  *   4. device.id (MAC address — last resort)
//  */
// function extractBeaconId(device, adStructures) {
//   const rawUUID = extractIBeaconUUID(adStructures);
//   if (rawUUID) return { id: rawUUID, source: 'rawScanRecord/iBeacon' };

//   if (device.manufacturerData) {
//     let bytes;
//     try {
//       const binary = atob(device.manufacturerData);
//       bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
//     } catch { /* ignore */ }

//     if (
//       bytes?.length >= 25          &&
//       bytes[0] === APPLE_COMPANY_ID_LO &&
//       bytes[1] === APPLE_COMPANY_ID_HI &&
//       bytes[2] === IBEACON_SUBTYPE     &&
//       bytes[3] === IBEACON_LENGTH
//     ) {
//       const hex = Array.from(bytes.slice(4, 20))
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('');
//       const uuid = [
//         hex.slice(0,  8),
//         hex.slice(8,  12),
//         hex.slice(12, 16),
//         hex.slice(16, 20),
//         hex.slice(20, 32),
//       ].join('-').toUpperCase();
//       return { id: uuid, source: 'manufacturerData/iBeacon' };
//     }
//   }

//   if (device.serviceUUIDs?.length > 0) {
//     return { id: device.serviceUUIDs[0].toUpperCase(), source: 'serviceUUIDs' };
//   }

//   return { id: device.id, source: 'device.id' };
// }

// // ── Device logger ─────────────────────────────────────────────────────────────

// function logDevice(device, adStructures) {
//   const iBeaconUUID = extractIBeaconUUID(adStructures);
//   const iBeaconMeta = iBeaconUUID ? extractIBeaconMeta(adStructures) : null;
//   const room        = iBeaconUUID ? getRoomByBeaconId(iBeaconUUID) : null;

//   console.log(
//     '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
//     `[BLE] Device spotted\n` +
//     `  id            : ${device.id}\n` +
//     `  name          : ${device.localName ?? device.name ?? '(none)'}\n` +
//     `  rssi          : ${device.rssi} dBm\n` +
//     `  txPowerLevel  : ${device.txPowerLevel ?? '(none)'}\n` +
//     `  serviceUUIDs  : ${JSON.stringify(device.serviceUUIDs ?? [])}\n` +
//     `  serviceData   : ${JSON.stringify(device.serviceData ?? {})}\n` +
//     `  mfrData(raw)  : ${device.manufacturerData ?? '(null — expected on Android 12+)'}\n` +
//     `  rawScanRecord : ${device.rawScanRecord ?? '(null)'}\n` +
//     `  AD structures :${
//       adStructures.length === 0
//         ? ' (none parsed)'
//         : adStructures.map(a =>
//             `\n    type=0x${a.type.toString(16).padStart(2, '0')} [${a.hex}]`
//           ).join('')
//     }\n` +
//     (iBeaconUUID
//       ? `  ✅ iBeacon UUID : ${iBeaconUUID}\n` +
//         `     major=${iBeaconMeta?.major}  minor=${iBeaconMeta?.minor}  tx=${iBeaconMeta?.txPower} dBm\n` +
//         `     room match    : ${room ? `✅ ${room.label}` : '❌ no match — add this UUID to roomContexts'}\n`
//       : `  ℹ️  No iBeacon UUID found in AD structures\n`) +
//     '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
//   );
// }

// // ── Hook ──────────────────────────────────────────────────────────────────────

// export default function useBLEScanning() {
//   const [strongestBeaconId, setStrongestBeaconId] = useState(null);
//   const [isScanning, setIsScanning]               = useState(false);
//   const [error, setError]                         = useState(null);

//   const managerRef    = useRef(null);
//   const rssiMapRef    = useRef({});        // { [beaconId]: number[] }
//   const loggedIdsRef  = useRef(new Set()); // device.ids logged since last eval
//   const evalTimerRef  = useRef(null);
//   const isMountedRef  = useRef(true);
//   const scanActiveRef = useRef(false);     // guard against double-start

//   // ── Evaluate accumulated RSSI ─────────────────────────────────────
//   const evaluate = useCallback(() => {
//     const rssiMap = rssiMapRef.current;
//     const ids     = Object.keys(rssiMap);

//     console.log(`\n[BLE] ── Eval: ${ids.length} ID(s) heard ──`);

//     // Reset logged set so new devices get logged in the next eval window
//     loggedIdsRef.current = new Set();

//     if (ids.length === 0) {
//       console.log('[BLE] Nothing heard this window.');
//       return;
//     }

//     let bestId   = null;
//     let bestRSSI = -Infinity;

//     ids.forEach(id => {
//       const readings = rssiMap[id];
//       const avg      = readings.reduce((a, b) => a + b, 0) / readings.length;
//       const room     = getRoomByBeaconId(id);

//       console.log(
//         `[BLE] ${room ? `✅ KNOWN   ${room.label}` : '❓ UNKNOWN'} ` +
//         `| ${id} | avg=${avg.toFixed(1)} dBm | n=${readings.length}`
//       );

//       if (room && avg > bestRSSI) {
//         bestRSSI = avg;
//         bestId   = id;
//       }
//     });

//     // Clear accumulator for next window
//     rssiMapRef.current = {};

//     if (bestId) {
//       const room = getRoomByBeaconId(bestId);
//       console.log(`[BLE] 🏆 ${room.label} (${bestId}) @ ${bestRSSI.toFixed(1)} dBm`);
//       if (isMountedRef.current) setStrongestBeaconId(bestId);
//     } else {
//       console.log('[BLE] No known beacons this window.');
//     }
//   }, []);

//   // ── Eval timer loop (runs independently of scan) ──────────────────
//   const startEvalLoop = useCallback(() => {
//     const tick = () => {
//       if (!isMountedRef.current) return;
//       evaluate();
//       evalTimerRef.current = setTimeout(tick, EVAL_INTERVAL);
//     };
//     evalTimerRef.current = setTimeout(tick, EVAL_INTERVAL);
//   }, [evaluate]);

//   // ── Start continuous scan ─────────────────────────────────────────
//   const startScanning = useCallback(async () => {
//     if (scanActiveRef.current) return;
//     setError(null);

//     const granted = await requestPermissions();
//     if (!granted) {
//       setError('Bluetooth/location permissions denied.');
//       console.warn('[BLE] Permissions not granted.');
//       return;
//     }

//     const manager = managerRef.current;
//     if (!manager) return;

//     console.log('[BLE] Starting continuous scan (LOW_LATENCY)...');

//     manager.startDeviceScan(
//       null,
//       { allowDuplicates: true, scanMode: 2 },
//       (scanError, device) => {
//         if (scanError) {
//           console.warn('[BLE] Scan error:', scanError.message);
//           setError(scanError.message);
//           return;
//         }

//         if (!device || device.rssi === null || device.rssi === 0) return;
//         if (device.rssi < MIN_RSSI) return;

//         const adStructures = parseAdStructures(device.rawScanRecord);

//         // Log each device once per eval window
//         if (!loggedIdsRef.current.has(device.id)) {
//           loggedIdsRef.current.add(device.id);
//           logDevice(device, adStructures);
//         }

//         const { id: beaconId, source } = extractBeaconId(device, adStructures);

//         if (!rssiMapRef.current[beaconId]) {
//           rssiMapRef.current[beaconId] = [];
//           console.log(`[BLE] Accumulating: ${beaconId} (via ${source})`);
//         }
//         rssiMapRef.current[beaconId].push(device.rssi);
//       }
//     );

//     scanActiveRef.current = true;
//     setIsScanning(true);
//     startEvalLoop();
//   }, [startEvalLoop]);

//   // ── Stop ──────────────────────────────────────────────────────────
//   const stopScanning = useCallback(() => {
//     clearTimeout(evalTimerRef.current);
//     managerRef.current?.stopDeviceScan();
//     scanActiveRef.current = false;
//     setIsScanning(false);
//     console.log('[BLE] Scanning stopped.');
//   }, []);

//   // ── Lifecycle ─────────────────────────────────────────────────────
//   useEffect(() => {
//     isMountedRef.current = true;
//     managerRef.current   = new BleManager();

//     const subscription = managerRef.current.onStateChange(state => {
//       console.log(`[BLE] Adapter state: ${state}`);
//       if (state === 'PoweredOn') {
//         subscription.remove();
//         startScanning();
//       } else if (state === 'PoweredOff') {
//         setError('Bluetooth is off. Please enable it.');
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

// =========================================================================================================================================== //

/**
 * useBLEScanning.js
 * -----------------
 * Continuous BLE scan with periodic RSSI evaluation.
 *
 * Scan runs continuously (never stopped/restarted) to avoid Android's
 * 5-cycles-per-30s throttle which silently drops unfamiliar devices.
 *
 * During each eval window, devices are accumulated silently.
 * At the end of each window, one clean summary block is printed.
 *
 * rawScanRecord is parsed to extract iBeacon UUIDs since Android 12+
 * strips Apple manufacturer data before it reaches userspace.
 */

// import { useEffect, useRef, useState, useCallback } from 'react';
// import { BleManager } from 'react-native-ble-plx';
// import { Platform, PermissionsAndroid } from 'react-native';
// import { getRoomByBeaconId } from '../data/roomContexts';

// // ── Tuning ───────────────────────────────────────────────────────────────────

// const EVAL_INTERVAL = 3000;  // ms — how often to evaluate accumulated RSSI
// const MIN_RSSI      = -100;  // dBm — ignore very weak signals

// // ── iBeacon AD constants ─────────────────────────────────────────────────────

// const AD_TYPE_MANUFACTURER = 0xFF;
// const APPLE_COMPANY_ID_LO  = 0x4C;
// const APPLE_COMPANY_ID_HI  = 0x00;
// const IBEACON_SUBTYPE      = 0x02;
// const IBEACON_LENGTH       = 0x15;

// // ── Permissions ──────────────────────────────────────────────────────────────

// async function requestPermissions() {
//   if (Platform.OS !== 'android') return true;

//   if (Platform.Version >= 31) {
//     const results = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//     ]);
//     return Object.values(results).every(
//       r => r === PermissionsAndroid.RESULTS.GRANTED
//     );
//   }

//   const result = await PermissionsAndroid.request(
//     PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
//   );
//   return result === PermissionsAndroid.RESULTS.GRANTED;
// }

// // ── AD structure parser ──────────────────────────────────────────────────────

// function parseAdStructures(base64) {
//   if (!base64) return [];
//   let bytes;
//   try {
//     const binary = atob(base64);
//     bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
//   } catch {
//     return [];
//   }

//   const structures = [];
//   let i = 0;
//   while (i < bytes.length) {
//     const length = bytes[i];
//     if (length === 0) break;
//     if (i + length >= bytes.length) break;
//     const type    = bytes[i + 1];
//     const payload = bytes.slice(i + 2, i + 1 + length);
//     const hex     = Array.from(payload)
//       .map(b => b.toString(16).padStart(2, '0'))
//       .join(' ');
//     structures.push({ type, payload, hex });
//     i += 1 + length;
//   }
//   return structures;
// }

// function extractIBeaconUUID(adStructures) {
//   for (const ad of adStructures) {
//     if (ad.type !== AD_TYPE_MANUFACTURER) continue;
//     const p = ad.payload;
//     if (p.length < 25)                continue;
//     if (p[0] !== APPLE_COMPANY_ID_LO) continue;
//     if (p[1] !== APPLE_COMPANY_ID_HI) continue;
//     if (p[2] !== IBEACON_SUBTYPE)     continue;
//     if (p[3] !== IBEACON_LENGTH)      continue;
//     const hex = Array.from(p.slice(4, 20))
//       .map(b => b.toString(16).padStart(2, '0'))
//       .join('');
//     return [
//       hex.slice(0,  8),
//       hex.slice(8,  12),
//       hex.slice(12, 16),
//       hex.slice(16, 20),
//       hex.slice(20, 32),
//     ].join('-').toUpperCase();
//   }
//   return null;
// }

// function extractIBeaconMeta(adStructures) {
//   for (const ad of adStructures) {
//     if (ad.type !== AD_TYPE_MANUFACTURER) continue;
//     const p = ad.payload;
//     if (p.length < 25)                continue;
//     if (p[0] !== APPLE_COMPANY_ID_LO) continue;
//     if (p[1] !== APPLE_COMPANY_ID_HI) continue;
//     if (p[2] !== IBEACON_SUBTYPE)     continue;
//     if (p[3] !== IBEACON_LENGTH)      continue;
//     return {
//       major:   (p[20] << 8) | p[21],
//       minor:   (p[22] << 8) | p[23],
//       txPower: p[24] > 127 ? p[24] - 256 : p[24],
//     };
//   }
//   return null;
// }

// function extractBeaconId(device, adStructures) {
//   const rawUUID = extractIBeaconUUID(adStructures);
//   if (rawUUID) return { id: rawUUID, source: 'iBeacon/rawScanRecord' };

//   if (device.manufacturerData) {
//     let bytes;
//     try {
//       const binary = atob(device.manufacturerData);
//       bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
//     } catch { /* ignore */ }
//     if (
//       bytes?.length >= 25          &&
//       bytes[0] === APPLE_COMPANY_ID_LO &&
//       bytes[1] === APPLE_COMPANY_ID_HI &&
//       bytes[2] === IBEACON_SUBTYPE     &&
//       bytes[3] === IBEACON_LENGTH
//     ) {
//       const hex = Array.from(bytes.slice(4, 20))
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('');
//       const uuid = [
//         hex.slice(0,  8), hex.slice(8,  12),
//         hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32),
//       ].join('-').toUpperCase();
//       return { id: uuid, source: 'iBeacon/manufacturerData' };
//     }
//   }

//   if (device.serviceUUIDs?.length > 0) {
//     return { id: device.serviceUUIDs[0].toUpperCase(), source: 'serviceUUIDs' };
//   }

//   return { id: device.id, source: 'device.id' };
// }

// // ── Hook ──────────────────────────────────────────────────────────────────────

// export default function useBLEScanning() {
//   const [strongestBeaconId, setStrongestBeaconId] = useState(null);
//   const [isScanning, setIsScanning]               = useState(false);
//   const [error, setError]                         = useState(null);

//   const managerRef    = useRef(null);
//   // { [beaconId]: { rssi: number[], mac: string, name: string|null,
//   //                 iBeacon: {uuid,major,minor,txPower}|null, source: string } }
//   const devicesRef    = useRef({});
//   const evalTimerRef  = useRef(null);
//   const isMountedRef  = useRef(true);
//   const scanActiveRef = useRef(false);

//   // ── Evaluate + print summary ──────────────────────────────────────
//   const evaluate = useCallback(() => {
//     const devices = devicesRef.current;
//     const ids     = Object.keys(devices);

//     if (ids.length === 0) {
//       console.log('[BLE] ── No devices heard ──');
//       return;
//     }

//     let bestId   = null;
//     let bestRSSI = -Infinity;

//     // Sort: known beacons first, then by avg RSSI descending
//     const sorted = ids
//       .map(id => {
//         const d      = devices[id];
//         const avg    = d.rssi.reduce((a, b) => a + b, 0) / d.rssi.length;
//         const room   = getRoomByBeaconId(id);
//         return { id, avg, room, d };
//       })
//       .sort((a, b) => {
//         if (a.room && !b.room) return -1;
//         if (!a.room && b.room) return 1;
//         return b.avg - a.avg;
//       });

//     const lines = ['[BLE] ══════════════════════════════════'];
//     sorted.forEach(({ id, avg, room, d }) => {
//       const tag     = room ? `✅ ${room.label}` : '❓';
//       const nameStr = d.name ? ` "${d.name}"` : '';
//       const ibStr   = d.iBeacon
//         ? ` | iBeacon maj=${d.iBeacon.major} min=${d.iBeacon.minor} tx=${d.iBeacon.txPower}`
//         : '';
//       lines.push(
//         `  ${tag} | mac=${d.mac}${nameStr} | id=${id} | ` +
//         `avg=${avg.toFixed(1)} dBm n=${d.rssi.length} src=${d.source}${ibStr}`
//       );
//       if (room && avg > bestRSSI) {
//         bestRSSI = avg;
//         bestId   = id;
//       }
//     });

//     if (bestId) {
//       const room = getRoomByBeaconId(bestId);
//       lines.push(`[BLE] 🏆 Best: ${room.label} @ ${bestRSSI.toFixed(1)} dBm`);
//     } else {
//       lines.push('[BLE] No known beacons — check roomContexts beaconId values');
//     }
//     lines.push('[BLE] ══════════════════════════════════');
//     console.log(lines.join('\n'));

//     // Reset accumulator
//     devicesRef.current = {};

//     if (bestId && isMountedRef.current) setStrongestBeaconId(bestId);
//   }, []);

//   // ── Eval timer loop ───────────────────────────────────────────────
//   const startEvalLoop = useCallback(() => {
//     const tick = () => {
//       if (!isMountedRef.current) return;
//       evaluate();
//       evalTimerRef.current = setTimeout(tick, EVAL_INTERVAL);
//     };
//     evalTimerRef.current = setTimeout(tick, EVAL_INTERVAL);
//   }, [evaluate]);

//   // ── Start continuous scan ─────────────────────────────────────────
//   const startScanning = useCallback(async () => {
//     if (scanActiveRef.current) return;
//     setError(null);

//     const granted = await requestPermissions();
//     if (!granted) {
//       setError('Bluetooth/location permissions denied.');
//       return;
//     }

//     const manager = managerRef.current;
//     if (!manager) return;

//     console.log('[BLE] Starting continuous scan...');

//     manager.startDeviceScan(
//       null,
//       { allowDuplicates: true, scanMode: 2 },
//       (scanError, device) => {
//         if (scanError) {
//           console.warn('[BLE] Scan error:', scanError.message);
//           setError(scanError.message);
//           return;
//         }

//         if (!device || device.rssi === null || device.rssi === 0) return;
//         if (device.rssi < MIN_RSSI) return;

//         const adStructures = parseAdStructures(device.rawScanRecord);
//         const iBeaconUUID  = extractIBeaconUUID(adStructures);
//         const iBeaconMeta  = iBeaconUUID ? extractIBeaconMeta(adStructures) : null;
//         const { id: beaconId, source } = extractBeaconId(device, adStructures);

//         if (!devicesRef.current[beaconId]) {
//           // First time seeing this ID this window — store metadata
//           devicesRef.current[beaconId] = {
//             rssi:    [],
//             mac:     device.id,
//             name:    device.localName ?? device.name ?? null,
//             iBeacon: iBeaconMeta
//               ? { uuid: iBeaconUUID, ...iBeaconMeta }
//               : null,
//             source,
//           };
//         }

//         devicesRef.current[beaconId].rssi.push(device.rssi);
//       }
//     );

//     scanActiveRef.current = true;
//     setIsScanning(true);
//     startEvalLoop();
//   }, [startEvalLoop]);

//   // ── Stop ──────────────────────────────────────────────────────────
//   const stopScanning = useCallback(() => {
//     clearTimeout(evalTimerRef.current);
//     managerRef.current?.stopDeviceScan();
//     scanActiveRef.current = false;
//     setIsScanning(false);
//     console.log('[BLE] Scanning stopped.');
//   }, []);

//   // ── Lifecycle ─────────────────────────────────────────────────────
//   useEffect(() => {
//     isMountedRef.current = true;
//     managerRef.current   = new BleManager();

//     const subscription = managerRef.current.onStateChange(state => {
//       console.log(`[BLE] Adapter state: ${state}`);
//       if (state === 'PoweredOn') {
//         subscription.remove();
//         startScanning();
//       } else if (state === 'PoweredOff') {
//         setError('Bluetooth is off. Please enable it.');
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

// ================================================================================================================ //

// /**
//  * useBLEScanning.js
//  * -----------------
//  * iBeacon ranging using @hkpuits/react-native-beacons-manager.
//  *
//  * WHY THIS LIBRARY
//  * ----------------
//  * Android 12+ silently filters iBeacon advertisements from generic BLE
//  * scan results — react-native-ble-plx cannot see them regardless of scan
//  * mode or rawScanRecord parsing. The Android Beacon Library (which this
//  * package wraps) uses ScanFilter.setManufacturerData(0x004C, ...) at the
//  * native level, which is the same approach used by nRF Connect and kBeacon.
//  * This bypasses the Android 12+ filtering entirely.
//  *
//  * HOW IT WORKS
//  * ------------
//  * We register one ranging region per unique beacon UUID from roomContexts.
//  * The library fires a 'beaconsDidRange' event ~every second per region,
//  * containing an array of all beacons heard in that region with their RSSI.
//  * We accumulate those readings over EVAL_INTERVAL ms, then pick the
//  * strongest known beacon.
//  *
//  * BEACON SETUP
//  * ------------
//  * The physical beacon must be in iBeacon mode. Make sure its UUID matches
//  * the beaconId in roomContexts (uppercase, full UUID format).
//  *
//  * INSTALL
//  * -------
//  * npm install @hkpuits/react-native-beacons-manager
//  * Then trigger a new EAS build — this is a native module.
//  *
//  * PERMISSIONS
//  * -----------
//  * Android: BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION
//  * iOS: NSLocationWhenInUseUsageDescription in app.json infoPlist
//  *
//  * RETURN SHAPE (identical to all previous versions)
//  * -------------------------------------------------
//  * {
//  *   strongestBeaconId : string | null
//  *   isScanning        : boolean
//  *   error             : string | null
//  *   startScanning     : () => void
//  *   stopScanning      : () => void
//  * }
//  */

// import { useEffect, useRef, useState, useCallback } from 'react';
// import { DeviceEventEmitter, Platform, PermissionsAndroid } from 'react-native';
// import Beacons from '@hkpuits/react-native-beacons-manager';
// import { getAllRooms, getRoomByBeaconId } from '../data/roomContexts';

// // ── Tuning ───────────────────────────────────────────────────────────────────

// const EVAL_INTERVAL = 3000; // ms — how often to evaluate accumulated RSSI

// // ── Permissions ──────────────────────────────────────────────────────────────

// async function requestPermissions() {
//   if (Platform.OS !== 'android') return true;

//   if (Platform.Version >= 31) {
//     const results = await PermissionsAndroid.requestMultiple([
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//       PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//     ]);
//     return Object.values(results).every(
//       r => r === PermissionsAndroid.RESULTS.GRANTED
//     );
//   }

//   const result = await PermissionsAndroid.request(
//     PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
//   );
//   return result === PermissionsAndroid.RESULTS.GRANTED;
// }

// // ── Region helpers ────────────────────────────────────────────────────────────

// /**
//  * Build unique regions from roomContexts — one per distinct UUID.
//  * Rooms that still have placeholder beaconIds (no hyphens) are skipped.
//  */
// function buildRegions() {
//   const seen = new Set();
//   const regions = [];

//   getAllRooms().forEach(room => {
//     const uuid = room.beaconId?.toUpperCase();
//     // Skip placeholders like 'beacon-kitchen-001' and MAC addresses
//     if (!uuid || !uuid.includes('-') || uuid.split('-').length !== 5) return;
//     if (seen.has(uuid)) return;
//     seen.add(uuid);
//     regions.push({ identifier: room.id, uuid });
//   });

//   return regions;
// }

// // ── Hook ──────────────────────────────────────────────────────────────────────

// export default function useBLEScanning() {
//   const [strongestBeaconId, setStrongestBeaconId] = useState(null);
//   const [isScanning, setIsScanning]               = useState(false);
//   const [error, setError]                         = useState(null);

//   // { [uuid]: { rssi: number[], major: number, minor: number } }
//   const devicesRef   = useRef({});
//   const evalTimerRef = useRef(null);
//   const isMountedRef = useRef(true);
//   const regionsRef   = useRef([]);

//   // ── Evaluate accumulated RSSI ─────────────────────────────────────
//   const evaluate = useCallback(() => {
//     const devices = devicesRef.current;
//     const ids     = Object.keys(devices);

//     if (ids.length === 0) {
//       console.log('[Beacons] ══ No beacons heard ══');
//       devicesRef.current = {};
//       return;
//     }

//     let bestId   = null;
//     let bestRSSI = -Infinity;

//     const sorted = ids
//       .map(uuid => {
//         const d    = devices[uuid];
//         const avg  = d.rssi.reduce((a, b) => a + b, 0) / d.rssi.length;
//         const room = getRoomByBeaconId(uuid);
//         return { uuid, avg, room, d };
//       })
//       .sort((a, b) => {
//         if (a.room && !b.room) return -1;
//         if (!a.room && b.room) return 1;
//         return b.avg - a.avg;
//       });

//     const lines = ['[Beacons] ══════════════════════════════════'];
//     sorted.forEach(({ uuid, avg, room, d }) => {
//       const tag = room ? `✅ ${room.label}` : '❓ unknown';
//       lines.push(
//         `  ${tag} | uuid=${uuid} | avg=${avg.toFixed(1)} dBm` +
//         ` n=${d.rssi.length} maj=${d.major} min=${d.minor}`
//       );
//       if (room && avg > bestRSSI) {
//         bestRSSI = avg;
//         bestId   = uuid;
//       }
//     });

//     if (bestId) {
//       const room = getRoomByBeaconId(bestId);
//       lines.push(`[Beacons] 🏆 Best: ${room.label} @ ${bestRSSI.toFixed(1)} dBm`);
//     } else {
//       lines.push('[Beacons] No known beacons — check roomContexts beaconId values');
//     }
//     lines.push('[Beacons] ══════════════════════════════════');
//     console.log(lines.join('\n'));

//     devicesRef.current = {};

//     if (bestId && isMountedRef.current) setStrongestBeaconId(bestId);
//   }, []);

//   // ── Eval timer loop ───────────────────────────────────────────────
//   const startEvalLoop = useCallback(() => {
//     const tick = () => {
//       if (!isMountedRef.current) return;
//       evaluate();
//       evalTimerRef.current = setTimeout(tick, EVAL_INTERVAL);
//     };
//     evalTimerRef.current = setTimeout(tick, EVAL_INTERVAL);
//   }, [evaluate]);

//   // ── Start ranging ─────────────────────────────────────────────────
//   const startScanning = useCallback(async () => {
//     setError(null);

//     const granted = await requestPermissions();
//     if (!granted) {
//       setError('Bluetooth/location permissions denied.');
//       console.warn('[Beacons] Permissions not granted.');
//       return;
//     }

//     const regions = buildRegions();
//     if (regions.length === 0) {
//       setError('No valid beacon UUIDs found in roomContexts.');
//       console.warn('[Beacons] No valid regions to range — add real UUIDs to roomContexts.');
//       return;
//     }

//     regionsRef.current = regions;

//     // Android-only init — sets up the notification channel needed for
//     // background scanning by the Android Beacon Library
//     if (Platform.OS === 'android') {
//       Beacons.init();
//     }

//     // Tell the library to use the iBeacon layout:
//     // m:0-3=4c000215 — matches Apple company ID + iBeacon type/length
//     // i:4-19         — 16-byte proximity UUID
//     // i:20-21        — major
//     // i:22-23        — minor
//     // p:24-24        — TX power
//     Beacons.detectIBeacons();

//     console.log(
//       `[Beacons] Starting iBeacon ranging for ${regions.length} region(s):\n` +
//       regions.map(r => `  ${r.identifier} → ${r.uuid}`).join('\n')
//     );

//     try {
//       await Promise.all(
//         regions.map(region => Beacons.startRangingBeaconsInRegion(region))
//       );
//     } catch (e) {
//       setError(`Failed to start ranging: ${e.message}`);
//       console.warn('[Beacons] startRangingBeaconsInRegion error:', e);
//       return;
//     }

//     setIsScanning(true);
//     startEvalLoop();
//   }, [startEvalLoop]);

//   // ── Stop ranging ──────────────────────────────────────────────────
//   const stopScanning = useCallback(() => {
//     clearTimeout(evalTimerRef.current);
//     regionsRef.current.forEach(region => {
//       Beacons.stopRangingBeaconsInRegion(region).catch(() => {});
//     });
//     setIsScanning(false);
//     console.log('[Beacons] Ranging stopped.');
//   }, []);

//   // ── Lifecycle ─────────────────────────────────────────────────────
//   useEffect(() => {
//     isMountedRef.current = true;

//     // beaconsDidRange fires ~every 1s per region with all beacons in range
//     const subscription = DeviceEventEmitter.addListener(
//       'beaconsDidRange',
//       (data) => {
//         if (!data?.beacons) return;

//         data.beacons.forEach(beacon => {
//           const uuid = beacon.uuid?.toUpperCase();
//           const rssi = beacon.rssi;

//           if (!uuid || !rssi || rssi === 0) return;

//           if (!devicesRef.current[uuid]) {
//             devicesRef.current[uuid] = { rssi: [], major: beacon.major, minor: beacon.minor };
//           }
//           devicesRef.current[uuid].rssi.push(rssi);
//         });
//       }
//     );

//     startScanning();

//     return () => {
//       isMountedRef.current = false;
//       subscription.remove();
//       stopScanning();
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