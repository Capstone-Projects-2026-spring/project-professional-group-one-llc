/**
 * ─── SIMULATE WITHOUT THE PHYSICAL BEACON ──────────────────────────────────
 *
 * Set SIMULATE_BEACON = true below.
 * The hook will behave as if a beacon is detected 2 seconds after mounting,
 * then "leaves" after 10 seconds — so you can test the full flow without
 * any hardware.  Set back to false for production.
 *
 * ─── BC021 BEACON CONFIGURATION ────────────────────────────────────────────
 *
 * The BC021 broadcasts as an iBeacon. Its packets live inside
 * `manufacturerData` (base64 encoded), NOT as a standard service UUID.
 * This is why react-native-ble-plx finds other devices but "misses" it:
 *
 *   • You cannot filter by serviceUUIDs: ['...'] — iBeacons have no GATT
 *     service advertisement. Passing a UUID filter will exclude the beacon.
 *
 *   • You MUST scan with serviceUUIDs: null and then parse the
 *     manufacturerData payload yourself to find Apple's company ID (0x004C)
 *     and the iBeacon subtype byte (0x02).
 *
 *   • The beacon may advertise as "non-connectable" — this is normal and
 *     expected. You don't need to connect to it, just scan passively.
 *
 * How to find your beacon's UUID, Major, Minor:
 *   - Open "Blue Charm Beacons" app (Android) while next to the beacon
 *   - Tap the beacon in the list → Beacon Detail → copy UUID, Major, Minor
 *   - Paste them into BEACON_CONFIG below
 *
 * ─── ANDROID PERMISSIONS ───────────────────────────────────────────────────
 *
 * Android 12+ (API 31+): BLUETOOTH_SCAN + BLUETOOTH_CONNECT + FINE_LOCATION
 * Android 11 and below:  ACCESS_FINE_LOCATION only
 *
 * Both are handled automatically by this hook.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";

// ─── SIMULATION FLAG ────────────────────────────────────────────────────────
// Flip to true when you don't have the physical beacon yet.
const SIMULATE_BEACON = true;

// ─── YOUR BEACON'S IDENTITY ─────────────────────────────────────────────────
// Fill these in from the Blue Charm app (or leave as-is for simulation).
const BEACON_CONFIG = {
  // iBeacon Proximity UUID — copy from Blue Charm app → Beacon Detail
  uuid: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0", // BC021 default UUID

  // Major / Minor values — set in Blue Charm app; used to tell rooms apart
  // Set to null to match ANY major/minor (useful when you only have one beacon)
  major: null,
  minor: null,

  // Map this beacon to a room ID in your roomContexts.js
  // This value is passed straight to setRoomManually(roomId)
  roomId: "living_room",

  // RSSI threshold — only trigger when signal is strong enough.
  // -70 ≈ within ~3-5 metres; -90 = further away but more noise.
  rssiThreshold: -80,
};

// ─── iBeacon MANUFACTURER DATA PARSER ───────────────────────────────────────
// iBeacon packets look like this in hex:
//   4C 00            → Apple company ID (little-endian)
//   02 15            → iBeacon subtype + length
//   [16 bytes UUID]
//   [2 bytes major]
//   [2 bytes minor]
//   [1 byte measuredPower]
const parseIBeacon = (base64ManufacturerData) => {
  if (!base64ManufacturerData) return null;

  try {
    const binary = atob(base64ManufacturerData);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Need at least 25 bytes for a full iBeacon payload
    if (bytes.length < 25) return null;

    // Bytes 0-1: Apple company ID = 0x004C (stored little-endian as 4C 00)
    const companyId = bytes[0] | (bytes[1] << 8);
    if (companyId !== 0x004c) return null;

    // Byte 2: iBeacon subtype = 0x02
    if (bytes[2] !== 0x02) return null;

    // Bytes 4–19: UUID (16 bytes)
    const uuidBytes = bytes.slice(4, 20);
    const hex = Array.from(uuidBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const uuid =
      `${hex.slice(0, 8)}-${hex.slice(8, 12)}-` +
      `${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

    // Bytes 20-21: Major (big-endian)
    const major = (bytes[20] << 8) | bytes[21];

    // Bytes 22-23: Minor (big-endian)
    const minor = (bytes[22] << 8) | bytes[23];

    // Byte 24: Measured power (signed)
    const measuredPower = bytes[24] > 127 ? bytes[24] - 256 : bytes[24];

    return { uuid: uuid.toUpperCase(), major, minor, measuredPower };
  } catch {
    return null;
  }
};

// ─── PERMISSIONS ─────────────────────────────────────────────────────────────
const requestBluetoothPermissions = async () => {
  if (Platform.OS !== "android") return true;

  const apiLevel =
    typeof Platform.Version === "number"
      ? Platform.Version
      : parseInt(Platform.Version, 10);

  try {
    if (apiLevel >= 31) {
      // Android 12+
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
      // Android 11 and below
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === "granted";
    }
  } catch (e) {
    console.error("[Beacon] Permission request error:", e);
    return false;
  }
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────

/**
 * useBeaconDetection({ setRoomManually })
 *
 * Pass in `setRoomManually` from useLocationDetection.
 * The hook will call it automatically when the beacon enters or leaves range.
 *
 * Returns:
 *  {
 *    beaconVisible : boolean         — is the target beacon currently in range?
 *    lastRssi      : number | null   — most recent signal strength
 *    scanStatus    : string          — 'idle' | 'scanning' | 'error' | 'simulating'
 *    error         : string | null   — human-readable error if scanStatus === 'error'
 *    startScan     : () => void      — call to (re)start scanning
 *    stopScan      : () => void      — call to stop scanning
 *  }
 */
export default function useBeaconDetection({ setRoomManually } = {}) {
  const [beaconVisible, setBeaconVisible] = useState(false);
  const [lastRssi, setLastRssi] = useState(null);
  const [scanStatus, setScanStatus] = useState("idle");
  const [error, setError] = useState(null);

  const managerRef = useRef(null);
  const lossTimerRef = useRef(null); // fires when beacon signal disappears
  const mountedRef = useRef(true);

  // ── Beacon found ────────────────────────────────────────────────────────
  const onBeaconDetected = useCallback(
    (rssi) => {
      if (!mountedRef.current) return;

      // Reset loss timer every time we get a fresh ping
      if (lossTimerRef.current) clearTimeout(lossTimerRef.current);
      lossTimerRef.current = setTimeout(() => {
        // No ping for 8 seconds → assume beacon left range
        if (mountedRef.current) {
          setBeaconVisible(false);
          setLastRssi(null);
          setRoomManually?.(null);
          console.log("[Beacon] Signal lost — clearing room.");
        }
      }, 8000);

      setLastRssi(rssi);

      if (!beaconVisible) {
        setBeaconVisible(true);
        setRoomManually?.(BEACON_CONFIG.roomId);
        console.log(
          `[Beacon] Detected! RSSI=${rssi}, room="${BEACON_CONFIG.roomId}"`
        );
      }
    },
    [beaconVisible, setRoomManually]
  );

  // ── Simulation mode ─────────────────────────────────────────────────────
  const runSimulation = useCallback(() => {
    setScanStatus("simulating");
    console.log("[Beacon] SIMULATION MODE — no real hardware needed.");

    const enterTimer = setTimeout(() => {
      onBeaconDetected(-62);
    }, 2000);

    // Simulate the beacon going out of range after 15s
    const exitTimer = setTimeout(() => {
      if (mountedRef.current) {
        setBeaconVisible(false);
        setLastRssi(null);
        setRoomManually?.(null);
        console.log("[Beacon] SIMULATION: beacon left range.");
      }
    }, 15000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [onBeaconDetected, setRoomManually]);

  // ── Real BLE scan ────────────────────────────────────────────────────────
  const startScan = useCallback(async () => {
    if (SIMULATE_BEACON) {
      return runSimulation();
    }

    // Dynamically import so the module isn't needed in Expo Go at all
    let BleManager;
    try {
      ({ BleManager } = require("react-native-ble-plx"));
    } catch {
      setError(
        "react-native-ble-plx is not installed or this is Expo Go. " +
          "Run: npx expo install react-native-ble-plx  then  npx expo run:android"
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

    if (!managerRef.current) {
      managerRef.current = new BleManager();
    }
    const manager = managerRef.current;

    // Wait for BT adapter to power on
    const state = await manager.state();
    if (state !== "PoweredOn") {
      await new Promise((resolve) => {
        const sub = manager.onStateChange((s) => {
          if (s === "PoweredOn") {
            sub.remove();
            resolve();
          }
        }, true);
      });
    }

    setScanStatus("scanning");
    setError(null);
    console.log("[Beacon] Starting BLE scan...");

    manager.startDeviceScan(
      null, // ← MUST be null for iBeacons — no service UUID filter
      {
        allowDuplicates: true, // needed to get repeated RSSI updates
        scanMode: 2, // ScanMode.LowLatency = 2  (fastest)
      },
      (err, device) => {
        if (!mountedRef.current) return;
        if (err) {
          console.error("[Beacon] Scan error:", err.message);
          setError(err.message);
          setScanStatus("error");
          return;
        }
        if (!device) return;

        // ── Quick pre-filter: skip if RSSI is too weak ───────────────────
        if (device.rssi !== null && device.rssi < BEACON_CONFIG.rssiThreshold)
          return;

        // ── Try to match by device name first (fast path) ────────────────
        const name = device.name || device.localName || "";
        const looksLikeBC021 = name.toLowerCase().startsWith("bluecharm");

        // ── Parse manufacturer data (the real iBeacon check) ────────────
        const parsed = parseIBeacon(device.manufacturerData);

        if (!parsed && !looksLikeBC021) return; // not our beacon

        if (parsed) {
          // UUID check (case-insensitive)
          const uuidMatch =
            parsed.uuid.toUpperCase() === BEACON_CONFIG.uuid.toUpperCase();

          // Major / Minor checks (skip if config is null = match any)
          const majorMatch =
            BEACON_CONFIG.major === null ||
            parsed.major === BEACON_CONFIG.major;
          const minorMatch =
            BEACON_CONFIG.minor === null ||
            parsed.minor === BEACON_CONFIG.minor;

          if (!uuidMatch || !majorMatch || !minorMatch) return;
        }

        onBeaconDetected(device.rssi);
      }
    );
  }, [runSimulation, onBeaconDetected]);

  const stopScan = useCallback(() => {
    if (lossTimerRef.current) clearTimeout(lossTimerRef.current);
    managerRef.current?.stopDeviceScan();
    setScanStatus("idle");
    console.log("[Beacon] Scan stopped.");
  }, []);

  // ── Auto-start on mount, cleanup on unmount ──────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let cleanup;
    startScan().then((fn) => {
      cleanup = fn;
    });

    return () => {
      mountedRef.current = false;
      if (typeof cleanup === "function") cleanup();
      stopScan();
      managerRef.current?.destroy();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    beaconVisible,
    lastRssi,
    scanStatus,
    error,
    startScan,
    stopScan,
  };
}
