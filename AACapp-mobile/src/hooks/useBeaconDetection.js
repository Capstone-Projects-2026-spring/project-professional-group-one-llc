/**
 * useBLEScanning.js
 *
 * Uses react-native-ble-plx to detect BlueCharm BC021 iBeacons.
 *
 * KEY FACTS ABOUT BLE-PLX AND IBEACONS:
 *
 * Android 12+: Apple manufacturer data is stripped from userspace BLE results.
 *   device.manufacturerData = null for iBeacons.
 *   BUT device.rawScanRecord = base64-encoded raw advertisement bytes.
 *   We decode rawScanRecord and walk the AD structures to find the iBeacon UUID.
 *
 * iOS: device.manufacturerData contains the manufacturer payload (incl. company ID).
 *   device.rawScanRecord on iOS is a JSON-encoded object, NOT raw bytes.
 *   We parse manufacturerData directly on iOS.
 *
 * atob() is unreliable in Hermes. We use a pure-JS base64 decoder.
 *
 * PERMISSION REQUIREMENT: ACCESS_FINE_LOCATION must be granted AND
 * BLUETOOTH_SCAN must NOT have neverForLocation="true" in AndroidManifest.
 * iBeacon detection IS location-based — Android enforces this.
 *
 * BlueCharm BC021 default UUID: 426C7565-4368-6172-6D42-6561636F6E74
 * ("BlueCharmBeacont" in ASCII). Configure in roomContexts.js.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { getRoomByBeaconId } from '../data/roomContexts';

const SCAN_WINDOW   = 4000;  // ms — accumulate RSSI readings
const SCAN_COOLDOWN = 2000;  // ms — pause between windows
const MIN_RSSI      = -85;   // dBm — ignore very weak signals

// ── Pure-JS base64 decoder (atob is unreliable in Hermes) ──────────────────
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_TABLE = new Uint8Array(256).fill(255);
for (let i = 0; i < 64; i++) B64_TABLE[B64.charCodeAt(i)] = i;

function b64ToBytes(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.replace(/[\s=]/g, '');
  const len = s.length;
  if (len === 0) return new Uint8Array(0);
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let o = 0;
  for (let i = 0; i < len; ) {
    const a = B64_TABLE[s.charCodeAt(i++)] ?? 0;
    const b = B64_TABLE[s.charCodeAt(i++)] ?? 0;
    const c = i < len ? (B64_TABLE[s.charCodeAt(i++)] ?? 0) : 0;
    const d = i < len ? (B64_TABLE[s.charCodeAt(i++)] ?? 0) : 0;
    if (o < out.length) out[o++] = (a << 2) | (b >> 4);
    if (o < out.length) out[o++] = ((b & 0x0f) << 4) | (c >> 2);
    if (o < out.length) out[o++] = ((c & 0x03) << 6) | d;
  }
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

// ── iBeacon parser ──────────────────────────────────────────────────────────
// Parses a manufacturer-specific payload (with company ID prefix).
// iBeacon layout:
//   [0-1] Company ID: 0x4C 0x00 (Apple, little-endian)
//   [2]   Type: 0x02
//   [3]   Length: 0x15 (21)
//   [4-19] UUID (16 bytes, big-endian)
//   [20-21] Major (big-endian uint16)
//   [22-23] Minor (big-endian uint16)
//   [24]   TX power (int8)
function parseIBeaconFromBytes(data) {
  if (!data || data.length < 25) return null;
  const companyId = data[0] | (data[1] << 8); // little-endian
  if (companyId !== 0x004c) return null;
  if (data[2] !== 0x02) return null;
  if (data[3] !== 0x15) return null;

  const hex = Array.from(data.slice(4, 20))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const uuid = [
    hex.slice(0, 8), hex.slice(8, 12),
    hex.slice(12, 16), hex.slice(16, 20), hex.slice(20),
  ].join('-').toUpperCase();

  return {
    uuid,
    major: (data[20] << 8) | data[21],
    minor: (data[22] << 8) | data[23],
    txPower: data[24] > 127 ? data[24] - 256 : data[24],
  };
}

// Walk a raw BLE advertisement payload (Uint8Array).
// Returns array of { type, data } for every AD structure found.
function walkAdStructures(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    const length = bytes[i++];
    if (length === 0 || i + length - 1 > bytes.length) break;
    out.push({ type: bytes[i], data: bytes.slice(i + 1, i + length) });
    i += length;
  }
  return out;
}

// Extract iBeacon UUID from rawScanRecord (Android — raw bytes, base64).
function extractFromRawScanRecord(rawScanRecordB64) {
  const bytes = b64ToBytes(rawScanRecordB64);
  if (!bytes) return null;
  for (const { type, data } of walkAdStructures(bytes)) {
    if (type !== 0xff) continue; // 0xFF = Manufacturer Specific
    const parsed = parseIBeaconFromBytes(data);
    if (parsed) return { ...parsed, source: 'rawScanRecord' };
  }
  return null;
}

// Extract iBeacon UUID from manufacturerData (iOS — raw bytes without
// the length/type prefix, but WITH the company ID, base64).
function extractFromManufacturerData(manufacturerDataB64) {
  const bytes = b64ToBytes(manufacturerDataB64);
  if (!bytes) return null;
  const parsed = parseIBeaconFromBytes(bytes);
  return parsed ? { ...parsed, source: 'manufacturerData' } : null;
}

// ── Permissions ─────────────────────────────────────────────────────────────
async function requestPermissions() {
  if (Platform.OS !== 'android') return true;
  const api = typeof Platform.Version === 'number'
    ? Platform.Version
    : parseInt(Platform.Version, 10);
  try {
    if (api >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      // ALL THREE must be granted for iBeacon detection on Android 12+
      const allGranted = Object.values(results).every(
        r => r === PermissionsAndroid.RESULTS.GRANTED
      );
      if (!allGranted) {
        console.warn('[BLE] Permission results:', JSON.stringify(results));
      }
      return allGranted;
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (e) {
    console.error('[BLE] Permission error:', e);
    return false;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export default function useBLEScanning() {
  const [strongestBeaconId, setStrongestBeaconId] = useState(null);
  const [isScanning, setIsScanning]               = useState(false);
  const [error, setError]                         = useState(null);

  const managerRef       = useRef(null);
  // { [uuid]: { rssis: number[], mac: string, name: string|null, source: string } }
  const devicesRef       = useRef({});
  const scanTimerRef     = useRef(null);
  const cooldownTimerRef = useRef(null);
  const isMountedRef     = useRef(true);

  // ── Evaluate one scan window ────────────────────────────────────────────
  const evaluateScan = useCallback(() => {
    const devices = devicesRef.current;
    const ids = Object.keys(devices);

    console.log(`\n[BLE] ═══ WINDOW COMPLETE — ${ids.length} beacon ID(s) ═══`);

    if (ids.length === 0) {
      console.log('[BLE] Nothing heard this window.');
      devicesRef.current = {};
      return;
    }

    let bestId   = null;
    let bestRSSI = -Infinity;

    ids.forEach(uuid => {
      const { rssis, mac, name, source } = devices[uuid];
      const avg  = rssis.reduce((a, b) => a + b, 0) / rssis.length;
      const room = getRoomByBeaconId(uuid);
      const tag  = room ? `✅ ${room.label}` : '❓ unknown';
      console.log(
        `[BLE]  ${tag} | uuid=${uuid} | avg=${avg.toFixed(1)} dBm` +
        ` n=${rssis.length} mac=${mac}${name ? ` name=${name}` : ''} src=${source}`
      );
      if (room && avg > bestRSSI) {
        bestRSSI = avg;
        bestId   = uuid;
      }
    });

    if (bestId) {
      const room = getRoomByBeaconId(bestId);
      console.log(`[BLE] 🏆 Best: ${room.label} (${bestId}) @ ${bestRSSI.toFixed(1)} dBm`);
      if (isMountedRef.current) setStrongestBeaconId(bestId);
    } else {
      console.log('[BLE] No known beacons — verify UUIDs in roomContexts.js');
      console.log('[BLE] Tip: BC021 default UUID = 426C7565-4368-6172-6D42-6561636F6E74');
    }

    devicesRef.current = {};
  }, []);

  // ── Scan cycle ──────────────────────────────────────────────────────────
  const runScanCycle = useCallback(() => {
    const manager = managerRef.current;
    if (!manager || !isMountedRef.current) return;

    devicesRef.current = {};
    setIsScanning(true);
    console.log('\n[BLE] ══ Starting scan window ══');

    manager.startDeviceScan(
      null,
      {
        allowDuplicates:  true,
        scanMode:         2,   // SCAN_MODE_LOW_LATENCY
        callbackType:     1,   // CALLBACK_TYPE_ALL_MATCHES
        legacyScan:       true, // iBeacons are legacy BLE advertisements
      },
      (scanError, device) => {
        if (!isMountedRef.current) return;

        if (scanError) {
          console.error('[BLE] Scan error:', scanError.message);
          setError(scanError.message);
          return;
        }

        if (!device || device.rssi === null || device.rssi === 0) return;
        if (device.rssi < MIN_RSSI) return;

        // ── Try to extract iBeacon UUID ──────────────────────────────────
        let beacon = null;

        // Android: parse rawScanRecord (manufacturer data is stripped in
        // Android 12+ before reaching userspace)
        if (Platform.OS === 'android' && device.rawScanRecord) {
          beacon = extractFromRawScanRecord(device.rawScanRecord);
          if (!beacon && device.manufacturerData) {
            beacon = extractFromManufacturerData(device.manufacturerData);
          }
        }

        // iOS: manufacturerData works directly
        if (Platform.OS !== 'android' && device.manufacturerData) {
          beacon = extractFromManufacturerData(device.manufacturerData);
        }

        if (!beacon) {
          // Log unknown devices once per window (helps diagnose UUID issues)
          if (!devicesRef.current[device.id]) {
            console.log(
              `[BLE] No iBeacon payload — id=${device.id}` +
              ` name=${device.localName ?? device.name ?? '(none)'}` +
              ` rssi=${device.rssi}` +
              ` mfrData=${device.manufacturerData ?? 'null'}` +
              ` rawRecord=${device.rawScanRecord
                ? device.rawScanRecord.slice(0, 32) + '...'
                : 'null'}`
            );
            // Mark as seen so we don't flood the log
            devicesRef.current[device.id] = { rssis: [], seen: true };
          }
          return;
        }

        const { uuid, source } = beacon;

        if (!devicesRef.current[uuid]) {
          devicesRef.current[uuid] = {
            rssis:  [],
            mac:    device.id,
            name:   device.localName ?? device.name ?? null,
            source,
          };
          console.log(`[BLE] New beacon this window: ${uuid} via ${source}`);
        }
        devicesRef.current[uuid].rssis.push(device.rssi);
      }
    );

    scanTimerRef.current = setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      evaluateScan();
      cooldownTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) runScanCycle();
      }, SCAN_COOLDOWN);
    }, SCAN_WINDOW);
  }, [evaluateScan]);

  // ── Public controls ─────────────────────────────────────────────────────
  const stopScanning = useCallback(() => {
    clearTimeout(scanTimerRef.current);
    clearTimeout(cooldownTimerRef.current);
    managerRef.current?.stopDeviceScan();
    setIsScanning(false);
    console.log('[BLE] Scanning stopped.');
  }, []);

  const startScanning = useCallback(async () => {
    setError(null);
    const granted = await requestPermissions();
    if (!granted) {
      const msg = 'Bluetooth/location permissions denied. All three are required on Android 12+.';
      setError(msg);
      console.warn('[BLE]', msg);
      return;
    }
    runScanCycle();
  }, [runScanCycle]);

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    managerRef.current   = new BleManager();

    const sub = managerRef.current.onStateChange(state => {
      console.log(`[BLE] Adapter state: ${state}`);
      if (state === 'PoweredOn') {
        sub.remove();
        startScanning();
      } else if (state === 'PoweredOff') {
        setError('Bluetooth is off. Please enable it.');
        stopScanning();
      } else if (state === 'Unauthorized') {
        setError('Bluetooth permission not granted.');
      }
    }, true);

    return () => {
      isMountedRef.current = false;
      sub.remove();
      stopScanning();
      managerRef.current?.destroy();
    };
  }, [startScanning, stopScanning]);

  return { strongestBeaconId, isScanning, error, startScanning, stopScanning };
}