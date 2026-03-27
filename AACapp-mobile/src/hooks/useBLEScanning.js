/**
 * useBLEScanning.js
 *
 * Uses a native Android module that calls ScanFilter.setManufacturerData(0x004C)
 * at the hardware level — the same technique used by nRF Connect and KBeacon app.
 * This bypasses Android 12+ userspace stripping of Apple manufacturer data.
 *
 * On iOS, falls back to react-native-ble-plx (manufacturerData is not stripped on iOS).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { getRoomByBeaconId } from '../data/roomContexts';

const SCAN_WINDOW   = 4000;
const SCAN_COOLDOWN = 2000;
const MIN_RSSI      = -90;

// ── iOS only: pure-JS base64 decoder ─────────────────────────────────────────
const _B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const _LUT = new Uint8Array(256).fill(255);
for (let i = 0; i < 64; i++) _LUT[_B64.charCodeAt(i)] = i;

function b64ToBytes(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.replace(/[\s=]/g, '');
  const len = s.length;
  if (!len) return new Uint8Array(0);
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let o = 0;
  for (let i = 0; i < len;) {
    const a = _LUT[s.charCodeAt(i++)] ?? 0;
    const b = _LUT[s.charCodeAt(i++)] ?? 0;
    const c = i < len ? (_LUT[s.charCodeAt(i++)] ?? 0) : 0;
    const d = i < len ? (_LUT[s.charCodeAt(i++)] ?? 0) : 0;
    if (o < out.length) out[o++] = (a << 2) | (b >> 4);
    if (o < out.length) out[o++] = ((b & 0x0f) << 4) | (c >> 2);
    if (o < out.length) out[o++] = ((c & 0x03) << 6) | d;
  }
  return out;
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// iOS: parse iBeacon from manufacturerData (not stripped on iOS)
function parseIBeaconIOS(manufacturerDataB64) {
  const bytes = b64ToBytes(manufacturerDataB64);
  if (!bytes || bytes.length < 25) return null;
  const company = bytes[0] | (bytes[1] << 8);
  if (company !== 0x004C) return null;
  if (bytes[2] !== 0x02 || bytes[3] !== 0x15) return null;
  const hex = toHex(bytes.slice(4, 20));
  const uuid = [
    hex.slice(0,8), hex.slice(8,12),
    hex.slice(12,16), hex.slice(16,20), hex.slice(20),
  ].join('-').toUpperCase();
  return { uuid, major: (bytes[20]<<8)|bytes[21], minor: (bytes[22]<<8)|bytes[23] };
}

// ── Permissions ───────────────────────────────────────────────────────────────
async function requestPermissions() {
  if (Platform.OS !== 'android') return true;
  const api = typeof Platform.Version === 'number'
    ? Platform.Version : parseInt(Platform.Version, 10);
  try {
    if (api >= 31) {
      const res = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(res).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
    }
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return r === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.error('[BLE] Permission error:', e);
    return false;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useBLEScanning() {
  const [strongestBeaconId, setStrongestBeaconId] = useState(null);
  const [isScanning, setIsScanning]               = useState(false);
  const [error, setError]                         = useState(null);

  const rssiMapRef       = useRef({});
  const scanTimerRef     = useRef(null);
  const cooldownTimerRef = useRef(null);
  const isMountedRef     = useRef(true);

  // iOS only
  const bleManagerRef    = useRef(null);

  const evaluateScan = useCallback(() => {
    const map = rssiMapRef.current;
    const ids = Object.keys(map).filter(id => map[id].rssis.length > 0);

    console.log(`\n[BLE] ════ WINDOW COMPLETE — ${ids.length} beacon(s) ════`);

    if (!ids.length) {
      console.log('[BLE] Nothing detected this window.');
      rssiMapRef.current = {};
      return;
    }

    let bestId = null, bestRSSI = -Infinity;

    ids.forEach(id => {
      const { rssis, source } = map[id];
      const avg  = rssis.reduce((a,b) => a+b, 0) / rssis.length;
      const room = getRoomByBeaconId(id);
      const threshold = room?.rssiThreshold ?? MIN_RSSI;
      const qualifies = room && avg >= threshold;//beacon only wins if threshold met
      console.log(
        `[BLE] ${room ? `✅ ${room.label}` : '❓ unknown'} | id=${id}` +
        ` avg=${avg.toFixed(1)}dBm n=${rssis.length} src=${source}` +
        (room ? ` thresh=${threshold} ${qualifies ? '✔' : '✖'}` : '')
      );
      if (!room) console.log(`[BLE]   ↳ Add to roomContexts.js if this is your beacon`);
      if (qualifies && avg > bestRSSI) { bestRSSI = avg; bestId = id; }
    });

    if (bestId) {
      const room = getRoomByBeaconId(bestId);
      console.log(`[BLE] 🏆 ${room.label} @ ${bestRSSI.toFixed(1)}dBm`);
      if (isMountedRef.current) setStrongestBeaconId(bestId);
    }

    rssiMapRef.current = {};
  }, []);

  const scheduleNextWindow = useCallback(() => {
    scanTimerRef.current = setTimeout(() => {
      evaluateScan();
      cooldownTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) scheduleNextWindow();
      }, SCAN_COOLDOWN);
    }, SCAN_WINDOW);
  }, [evaluateScan]);

  const stopScanning = useCallback(() => {
    clearTimeout(scanTimerRef.current);
    clearTimeout(cooldownTimerRef.current);
    if (Platform.OS === 'android') {
      NativeModules.BLEBeaconModule?.stopScan();
    } else {
      bleManagerRef.current?.stopDeviceScan();
    }
    setIsScanning(false);
    console.log('[BLE] Stopped.');
  }, []);

  const startScanning = useCallback(async () => {
    console.log('[BLE] startScanning called, platform:', Platform.OS); // ADD
    setError(null);

    console.log('[BLE] requesting permissions...');  // ADD
    const granted = await requestPermissions();
    console.log('[BLE] permissions granted:', granted);  // ADD

    if (!granted) {
      setError('Bluetooth + location permissions required.');
      return;
    }

    rssiMapRef.current = {};

    if (Platform.OS === 'android') {
      // ── Android: use native module with hardware ScanFilter ─────────────
      const mod = NativeModules.BLEBeaconModule;
      console.log('[BLE] mod exists:', !!mod);
      if (!mod) {
        setError('BLEBeaconModule not found — rebuild the app after adding the native module files.');
        return;
      }
      console.log('[BLE] calling mod.startScan()...');
      mod.startScan();
      console.log('[BLE] mod.startScan() called');
      setIsScanning(true);
      scheduleNextWindow();
    } else {
      // ── iOS: use ble-plx (manufacturerData not stripped on iOS) ─────────
      if (!bleManagerRef.current) {
        bleManagerRef.current = new BleManager();
      }
      const sub = bleManagerRef.current.onStateChange(state => {
        if (state === 'PoweredOn') {
          sub.remove();
          bleManagerRef.current.startDeviceScan(
            null,
            { allowDuplicates: true, scanMode: 2, legacyScan: true },
            (err, device) => {
              if (!isMountedRef.current) return;
              if (err) { setError(err.message); return; }
              if (!device?.rssi || device.rssi < MIN_RSSI) return;
              if (!device.manufacturerData) return;
              const ib = parseIBeaconIOS(device.manufacturerData);
              if (!ib) return;
              if (!rssiMapRef.current[ib.uuid]) {
                rssiMapRef.current[ib.uuid] = { rssis: [], source: 'ibeacon/ios' };
                console.log(`[BLE] ✅ iBeacon: ${ib.uuid} major=${ib.major} minor=${ib.minor}`);
              }
              rssiMapRef.current[ib.uuid].rssis.push(device.rssi);
            }
          );
          setIsScanning(true);
          scheduleNextWindow();
        } else if (state === 'PoweredOff') {
          setError('Bluetooth is off.');
        }
      }, true);
    }
  }, [scheduleNextWindow]);

  useEffect(() => {
    isMountedRef.current = true;

    let subscription;

    if (Platform.OS === 'android') {
      // Listen for beacon events from native module
      const emitter = new NativeEventEmitter(NativeModules.BLEBeaconModule);

      subscription = emitter.addListener('onBeaconDetected', (event) => {
        if (!isMountedRef.current) return;
        const uuid = event.uuid;
        const rssi = event.rssi;
        if (rssi < MIN_RSSI) return;
        if (!rssiMapRef.current[uuid]) {
          rssiMapRef.current[uuid] = { rssis: [], source: 'ibeacon/android-native' };
          console.log(
            `[BLE] ✅ iBeacon (native): ${uuid}` +
            ` major=${event.major} minor=${event.minor} rssi=${rssi}`
          );
        }
        rssiMapRef.current[uuid].rssis.push(rssi);
      });

      emitter.addListener('onBeaconError', (event) => {
        console.error('[BLE] Native error:', event.message);
        setError(event.message);
      });
    }

    startScanning();

    return () => {
      isMountedRef.current = false;
      subscription?.remove();
      stopScanning();
      bleManagerRef.current?.destroy();
    };
  }, [startScanning, stopScanning]);

  return { strongestBeaconId, isScanning, error, startScanning, stopScanning };
}