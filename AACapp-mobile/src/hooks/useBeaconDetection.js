/**
 * ─── SIMULATE WITHOUT THE PHYSICAL BEACON ──────────────────────────────────
 *
 * Set SIMULATE_BEACON = true to test the full flow without hardware.
 *
 * ─── BC021 + ANDROID: WHY CYCLE SCANNING ───────────────────────────────────
 *
 * The BC021 advertises TWO slots alternately:
 *   • KBeacon proprietary slot  (company ID 0x0006)
 *   • iBeacon slot              (company ID 0x004C, subtype 0x02)
 *
 * ble-plx delivers whichever slot arrives first per device per scan and
 * Android's OS-level deduplication swallows the rest. Continuous scanning
 * means you almost always get the KBeacon slot and never the iBeacon slot.
 *
 * The fix: scan in 4-second windows. Collect EVERY unique manufacturerData,
 * serviceData, and rawScanRecord per device. At the end of the window, print
 * a full forensic dump and try iBeacon parsing on all payloads — so even if
 * the iBeacon slot fires just once in 4 seconds, we catch it.
 *
 * ─── ANDROID PERMISSIONS ───────────────────────────────────────────────────
 *
 * Android 12+ (API 31+): BLUETOOTH_SCAN + BLUETOOTH_CONNECT + FINE_LOCATION
 * Android 11 and below:  ACCESS_FINE_LOCATION only
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";

// ─── SIMULATION FLAG ─────────────────────────────────────────────────────────
const SIMULATE_BEACON = false;

// ─── SCAN CYCLE TIMING ───────────────────────────────────────────────────────
const SCAN_WINDOW_MS   = 4000;
const SCAN_COOLDOWN_MS = 1500;

// ─── BEACON CONFIG ───────────────────────────────────────────────────────────
const BEACON_CONFIG = {
  uuid: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
  major: null,
  minor: null,
  roomId: "living_room",
  rssiThreshold: -80,
};

// ─── PERMISSIONS ──────────────────────────────────────────────────────────────
const requestBluetoothPermissions = async () => {
  if (Platform.OS !== "android") return true;
  const apiLevel =
    typeof Platform.Version === "number"
      ? Platform.Version
      : parseInt(Platform.Version, 10);
  try {
    if (apiLevel >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === "granted" &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === "granted"
      );
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === "granted";
    }
  } catch (e) {
    console.error("[Beacon] Permission error:", e);
    return false;
  }
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export default function useBeaconDetection({ setRoomManually } = {}) {
  const [beaconVisible, setBeaconVisible] = useState(false);
  const [lastRssi, setLastRssi]           = useState(null);
  const [scanStatus, setScanStatus]       = useState("idle");
  const [error, setError]                 = useState(null);

  const managerRef    = useRef(null);
  const lossTimerRef  = useRef(null);
  const scanTimerRef  = useRef(null);
  const cooldownRef   = useRef(null);
  const mountedRef    = useRef(true);

  // windowData: { [deviceId]: { rssis, payloads, serviceDataSamples, rawScanRecords, name } }
  const windowDataRef = useRef({});

  // ── Beacon found ──────────────────────────────────────────────────────────
  const onBeaconDetected = useCallback(
    (rssi) => {
      if (!mountedRef.current) return;
      if (lossTimerRef.current) clearTimeout(lossTimerRef.current);
      lossTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setBeaconVisible(false);
          setLastRssi(null);
          setRoomManually?.(null);
          console.log("[Beacon] Signal lost — clearing room.");
        }
      }, 8000);
      setLastRssi(rssi);
      setBeaconVisible((prev) => {
        if (!prev) {
          setRoomManually?.(BEACON_CONFIG.roomId);
          console.log(`[Beacon] Detected! RSSI=${rssi} room="${BEACON_CONFIG.roomId}"`);
        }
        return true;
      });
    },
    [setRoomManually]
  );

  // ── Decode base64 → { bytes, hex } ───────────────────────────────────────
  const decodePayload = (base64) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      return { bytes, hex };
    } catch {
      return null;
    }
  };

  // ── Dissect bytes into named fields ──────────────────────────────────────
  const dissectPayload = (bytes, hex) => {
    const fields = { byteLength: bytes.length, hex };

    if (bytes.length >= 2) {
      const companyId = bytes[0] | (bytes[1] << 8);
      fields.companyId = `0x${companyId.toString(16).toUpperCase().padStart(4, "0")}`;
      fields.companyIdKnown =
        companyId === 0x004c ? "Apple" :
        companyId === 0x0006 ? "Microsoft / KKM (KBeacon)" :
        companyId === 0x0075 ? "Samsung" :
        companyId === 0x00e0 ? "Google" :
        "unknown";
    }

    // iBeacon — try at offset 0 and 2
    for (const o of [0, 2]) {
      if (bytes.length < o + 25) continue;
      const companyId = bytes[o] | (bytes[o + 1] << 8);
      if (companyId !== 0x004c) continue;
      if (bytes[o + 2] !== 0x02) continue;

      const hex16 = Array.from(bytes.slice(o + 4, o + 20))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const uuid =
        `${hex16.slice(0, 8)}-${hex16.slice(8, 12)}-` +
        `${hex16.slice(12, 16)}-${hex16.slice(16, 20)}-${hex16.slice(20)}`;

      fields.format        = "iBeacon";
      fields.parseOffset   = o;
      fields.uuid          = uuid.toUpperCase();
      fields.major         = (bytes[o + 20] << 8) | bytes[o + 21];
      fields.minor         = (bytes[o + 22] << 8) | bytes[o + 23];
      fields.measuredPower = bytes[o + 24] > 127 ? bytes[o + 24] - 256 : bytes[o + 24];
      fields.uuidMatchesTarget =
        fields.uuid === BEACON_CONFIG.uuid.toUpperCase() ? "YES ✓" : "no";
      break;
    }

    // KBeacon proprietary — company 0x0006
    if (!fields.format && bytes.length >= 4) {
      const companyId = bytes[0] | (bytes[1] << 8);
      if (companyId === 0x0006) {
        fields.format      = "KBeacon proprietary";
        fields.deviceTypeByte = `0x${bytes[2].toString(16).padStart(2, "0")}`;
        fields.flagsByte   = `0x${bytes[3].toString(16).padStart(2, "0")}`;
        if (bytes.length > 6) {
          fields.remainingBytes = Array.from(bytes.slice(6))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ");
        }
      }
    }

    if (!fields.format) fields.format = "unrecognised";
    return fields;
  };

  // ── Evaluate window — full forensic dump ─────────────────────────────────
  const evaluateWindow = useCallback(() => {
    const data = windowDataRef.current;
    const ids  = Object.keys(data);

    if (ids.length === 0) {
      console.log("[Beacon] Window complete — no devices heard.");
      return;
    }

    console.log(`\n[Beacon] ═══ WINDOW COMPLETE — ${ids.length} device(s) ═══`);

    let bestMatch = null;
    let bestRssi  = -Infinity;

    ids.forEach((id) => {
      const { rssis, payloads, serviceDataSamples, rawScanRecords, name } = data[id];
      const avgRssi = (rssis.reduce((a, b) => a + b, 0) / rssis.length).toFixed(1);
      const maxRssi = Math.max(...rssis);
      const minRssi = Math.min(...rssis);

      console.log(`\n[Beacon] ── Device : ${id}${name ? `  (${name})` : ""}`);
      console.log(`[Beacon]    RSSI   : avg=${avgRssi} max=${maxRssi} min=${minRssi} samples=${rssis.length}`);

      // ── serviceData ──────────────────────────────────────────────────────
      if (serviceDataSamples.size > 0) {
        let i = 0;
        for (const sd of serviceDataSamples) {
          i++;
          let parsed;
          try { parsed = typeof sd === "string" ? JSON.parse(sd) : sd; } catch { parsed = null; }
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            Object.entries(parsed).forEach(([serviceUuid, b64]) => {
              const dec = decodePayload(b64);
              console.log(`[Beacon]    serviceData #${i} [${serviceUuid}] : ${dec ? dec.hex : b64}`);
            });
          } else {
            console.log(`[Beacon]    serviceData #${i} : ${sd}`);
          }
        }
      } else {
        console.log(`[Beacon]    serviceData   : (none)`);
      }

      // ── rawScanRecord ────────────────────────────────────────────────────
      if (rawScanRecords.size > 0) {
        let i = 0;
        for (const rr of rawScanRecords) {
          i++;
          const dec = decodePayload(rr);
          console.log(`[Beacon]    rawScanRecord #${i} : ${dec ? dec.hex : rr}`);
        }
      } else {
        console.log(`[Beacon]    rawScanRecord : (none)`);
      }

      // ── manufacturerData payloads ────────────────────────────────────────
      console.log(`[Beacon]    manufacturerData : ${payloads.size} unique payload(s)`);
      let iBeaconParsed = null;
      let pi = 0;
      for (const b64 of payloads) {
        pi++;
        const dec = decodePayload(b64);
        if (!dec) {
          console.log(`[Beacon]    Payload #${pi} : decode failed`);
          continue;
        }
        const f = dissectPayload(dec.bytes, dec.hex);
        console.log(`[Beacon]    Payload #${pi}:`);
        console.log(`[Beacon]      bytes      : ${f.byteLength}`);
        console.log(`[Beacon]      hex        : ${f.hex}`);
        console.log(`[Beacon]      companyId  : ${f.companyId || "n/a"}  (${f.companyIdKnown || "n/a"})`);
        console.log(`[Beacon]      format     : ${f.format}`);

        if (f.format === "iBeacon") {
          console.log(`[Beacon]      uuid       : ${f.uuid}`);
          console.log(`[Beacon]      major      : ${f.major}`);
          console.log(`[Beacon]      minor      : ${f.minor}`);
          console.log(`[Beacon]      measPower  : ${f.measuredPower} dBm`);
          console.log(`[Beacon]      uuidMatch  : ${f.uuidMatchesTarget}`);
          if (!iBeaconParsed) iBeaconParsed = f;
        } else if (f.format === "KBeacon proprietary") {
          console.log(`[Beacon]      deviceType : ${f.deviceTypeByte}`);
          console.log(`[Beacon]      flags      : ${f.flagsByte}`);
          if (f.remainingBytes) {
            console.log(`[Beacon]      remaining  : ${f.remainingBytes}`);
          }
        }
      }

      // ── Match against target ─────────────────────────────────────────────
      if (!iBeaconParsed) return;
      if (maxRssi < BEACON_CONFIG.rssiThreshold) return;

      const uuidMatch  = iBeaconParsed.uuid === BEACON_CONFIG.uuid.toUpperCase();
      const majorMatch = BEACON_CONFIG.major === null || iBeaconParsed.major === BEACON_CONFIG.major;
      const minorMatch = BEACON_CONFIG.minor === null || iBeaconParsed.minor === BEACON_CONFIG.minor;

      if (uuidMatch && majorMatch && minorMatch && maxRssi > bestRssi) {
        bestRssi  = maxRssi;
        bestMatch = { rssi: maxRssi, parsed: iBeaconParsed };
      }
    });

    console.log(`\n[Beacon] ═══ END WINDOW${bestMatch ? " — TARGET BEACON FOUND ✓" : ""} ═══\n`);
    if (bestMatch) onBeaconDetected(bestMatch.rssi);

    windowDataRef.current = {};
  }, [onBeaconDetected]);

  // ── Scan cycle ────────────────────────────────────────────────────────────
  const runScanCycle = useCallback(() => {
    const manager = managerRef.current;
    if (!manager || !mountedRef.current) return;

    windowDataRef.current = {};
    setScanStatus("scanning");
    console.log("[Beacon] Scan window started...");

    manager.startDeviceScan(
      null,
      {
        allowDuplicates: true,
        scanMode: 2,
        callbackType: 1,
        matchMode: 2,
        numOfMatches: 3,
        legacyScan: true,
      },
      (err, device) => {
        if (!mountedRef.current) return;
        if (err) {
          console.error("[Beacon] Scan error:", err.message);
          setError(err.message);
          setScanStatus("error");
          return;
        }
        if (!device || device.rssi === null) return;

        const id = device.id;
        if (!windowDataRef.current[id]) {
          windowDataRef.current[id] = {
            rssis: [],
            payloads: new Set(),
            serviceDataSamples: new Set(),
            rawScanRecords: new Set(),
            name: device.name || device.localName || null,
          };
        }

        const entry = windowDataRef.current[id];
        entry.rssis.push(device.rssi);
        if (device.manufacturerData) entry.payloads.add(device.manufacturerData);
        if (device.serviceData) {
          entry.serviceDataSamples.add(
            typeof device.serviceData === "string"
              ? device.serviceData
              : JSON.stringify(device.serviceData)
          );
        }
        if (device.rawScanRecord) entry.rawScanRecords.add(device.rawScanRecord);
      }
    );

    scanTimerRef.current = setTimeout(() => {
      manager.stopDeviceScan();
      evaluateWindow();
      cooldownRef.current = setTimeout(() => {
        if (mountedRef.current) runScanCycle();
      }, SCAN_COOLDOWN_MS);
    }, SCAN_WINDOW_MS);
  }, [evaluateWindow]);

  // ── Simulation mode ───────────────────────────────────────────────────────
  const runSimulation = useCallback(() => {
    setScanStatus("simulating");
    console.log("[Beacon] SIMULATION MODE — no real hardware needed.");
    const enterTimer = setTimeout(() => onBeaconDetected(-62), 2000);
    const exitTimer  = setTimeout(() => {
      if (mountedRef.current) {
        setBeaconVisible(false);
        setLastRssi(null);
        setRoomManually?.(null);
        console.log("[Beacon] SIMULATION: beacon left range.");
      }
    }, 15000);
    return () => { clearTimeout(enterTimer); clearTimeout(exitTimer); };
  }, [onBeaconDetected, setRoomManually]);

  // ── Public start / stop ───────────────────────────────────────────────────
  const startScan = useCallback(async () => {
    if (SIMULATE_BEACON) return runSimulation();

    let BleManager;
    try {
      ({ BleManager } = require("react-native-ble-plx"));
    } catch {
      setError(
        "react-native-ble-plx not found. Run: npx expo install react-native-ble-plx && npx expo run:android"
      );
      setScanStatus("error");
      return;
    }

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      setError("Bluetooth/location permission denied.");
      setScanStatus("error");
      return;
    }

    if (!managerRef.current) managerRef.current = new BleManager();
    const manager = managerRef.current;

    const state = await manager.state();
    if (state !== "PoweredOn") {
      await new Promise((resolve) => {
        const sub = manager.onStateChange((s) => {
          if (s === "PoweredOn") { sub.remove(); resolve(); }
        }, true);
      });
    }

    runScanCycle();
  }, [runSimulation, runScanCycle]);

  const stopScan = useCallback(() => {
    clearTimeout(scanTimerRef.current);
    clearTimeout(cooldownRef.current);
    if (lossTimerRef.current) clearTimeout(lossTimerRef.current);
    managerRef.current?.stopDeviceScan();
    setScanStatus("idle");
    console.log("[Beacon] Scanning stopped.");
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let cleanup;
    startScan().then((fn) => { cleanup = fn; });
    return () => {
      mountedRef.current = false;
      if (typeof cleanup === "function") cleanup();
      stopScan();
      managerRef.current?.destroy();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { beaconVisible, lastRssi, scanStatus, error, startScan, stopScan };
}