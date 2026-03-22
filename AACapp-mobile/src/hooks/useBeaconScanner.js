import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const SCAN_UUIDS = null;
const POWERED_ON_STATE = 'PoweredOn';

function normalizeName(device) {
  return (device?.localName || device?.name || '').trim();
}

function decodeBase64ToBytes(base64Value) {
  if (!base64Value) {
    return null;
  }

  const raw = String(base64Value).trim();

  // Some runtimes/libraries expose manufacturer data as hex text instead of base64.
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    const bytes = new Uint8Array(raw.length / 2);
    for (let i = 0; i < raw.length; i += 2) {
      bytes[i / 2] = Number.parseInt(raw.slice(i, i + 2), 16);
    }
    return bytes;
  }

  let clean = raw.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  while (clean.length % 4 !== 0) {
    clean += '=';
  }
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  // Fallback decoder for Hermes/JS runtimes where atob/Buffer may be unavailable.
  const manualDecode = () => {
    const output = [];
    let i = 0;

    while (i < clean.length) {
      const enc1 = base64Chars.indexOf(clean.charAt(i++));
      const enc2 = base64Chars.indexOf(clean.charAt(i++));
      const enc3 = base64Chars.indexOf(clean.charAt(i++));
      const enc4 = base64Chars.indexOf(clean.charAt(i++));

      if (enc1 < 0 || enc2 < 0 || enc3 < 0 || enc4 < 0) {
        return null;
      }

      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;

      output.push(chr1);
      if (enc3 !== 64) output.push(chr2);
      if (enc4 !== 64) output.push(chr3);
    }

    return Uint8Array.from(output);
  };

  try {
    if (typeof globalThis.atob === 'function') {
      const binary = globalThis.atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    if (typeof globalThis.Buffer !== 'undefined') {
      return Uint8Array.from(globalThis.Buffer.from(base64Value, 'base64'));
    }
  } catch {
    return manualDecode();
  }

  return manualDecode();
}

function formatUuidFromBytes(bytes) {
  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function parseIBeaconFromManufacturerData(manufacturerData) {
  const bytes = decodeBase64ToBytes(manufacturerData);
  if (!bytes || bytes.length < 23) {
    return null;
  }

  let payloadStart = -1;

  // Common iBeacon payload with Apple company id prefix: 4C 00 02 15
  for (let i = 0; i <= bytes.length - 25; i += 1) {
    if (
      bytes[i] === 0x4c &&
      bytes[i + 1] === 0x00 &&
      bytes[i + 2] === 0x02 &&
      bytes[i + 3] === 0x15
    ) {
      payloadStart = i + 4;
      break;
    }
  }

  // Some stacks provide manufacturer payload without company-id prefix: 02 15 ...
  if (payloadStart < 0 && bytes.length >= 23 && bytes[0] === 0x02 && bytes[1] === 0x15) {
    payloadStart = 2;
  }

  if (payloadStart < 0 || payloadStart + 20 > bytes.length) {
    return null;
  }

  const uuidBytes = bytes.slice(payloadStart, payloadStart + 16);
  const major = (bytes[payloadStart + 16] << 8) | bytes[payloadStart + 17];
  const minor = (bytes[payloadStart + 18] << 8) | bytes[payloadStart + 19];

  return {
    uuid: formatUuidFromBytes(uuidBytes),
    major,
    minor,
  };
}

function looksLikeBlueCharm(device) {
  const name = normalizeName(device).toLowerCase();
  const serviceUUIDs = (device?.serviceUUIDs || []).map((uuid) =>
    String(uuid).toLowerCase(),
  );

  if (name.includes('bluecharm')) {
    return true;
  }

  return serviceUUIDs.some((uuid) => uuid.includes('aa20'));
}

async function requestAndroidPermissions() {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version < 31) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  const scanGranted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  );
  const connectGranted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  );

  return (
    scanGranted === PermissionsAndroid.RESULTS.GRANTED &&
    connectGranted === PermissionsAndroid.RESULTS.GRANTED
  );
}

export default function useBeaconScanner() {
  const managerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState([]);

  const waitForPoweredOn = useCallback(async (manager, timeoutMs = 5000) => {
    const currentState = await manager.state();
    if (currentState === POWERED_ON_STATE) {
      return true;
    }

    return await new Promise((resolve) => {
      let finished = false;

      const timeoutId = setTimeout(() => {
        if (finished) return;
        finished = true;
        subscription.remove();
        resolve(false);
      }, timeoutMs);

      const subscription = manager.onStateChange((nextState) => {
        if (nextState !== POWERED_ON_STATE || finished) {
          return;
        }

        finished = true;
        clearTimeout(timeoutId);
        subscription.remove();
        resolve(true);
      }, true);
    });
  }, []);

  const stopScan = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.stopDeviceScan();
    }
    setIsScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    setError('');

    const permissionsOk = await requestAndroidPermissions();
    if (!permissionsOk) {
      setError('Bluetooth permission was denied.');
      return;
    }

    if (!managerRef.current) {
      managerRef.current = new BleManager();
    }

    const bluetoothReady = await waitForPoweredOn(managerRef.current);
    if (!bluetoothReady) {
      setError('Bluetooth is not ready yet. Please make sure Bluetooth is ON and try again.');
      setIsScanning(false);
      return;
    }

    setDevices([]);
    setIsScanning(true);

    managerRef.current.startDeviceScan(
      SCAN_UUIDS,
      { allowDuplicates: true },
      (scanError, scannedDevice) => {
        if (scanError) {
          setError(scanError.message || 'Bluetooth scan failed.');
          stopScan();
          return;
        }

        if (!scannedDevice) {
          return;
        }

        const name = normalizeName(scannedDevice);
        const isLikelyBlueCharm = looksLikeBlueCharm(scannedDevice);
        const iBeacon = parseIBeaconFromManufacturerData(
          scannedDevice.manufacturerData,
        );

        setDevices((prev) => {
          const next = {
            id: scannedDevice.id,
            name,
            rssi: scannedDevice.rssi,
            localName: scannedDevice.localName || '',
            txPowerLevel: scannedDevice.txPowerLevel,
            isLikelyBlueCharm,
            iBeacon,
            iBeaconUuid: iBeacon?.uuid || '',
            iBeaconMajor: typeof iBeacon?.major === 'number' ? iBeacon.major : null,
            iBeaconMinor: typeof iBeacon?.minor === 'number' ? iBeacon.minor : null,
            updatedAt: Date.now(),
          };

          const existingIndex = prev.findIndex((d) => d.id === scannedDevice.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...next };
            return updated.sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
          }

          return [...prev, next].sort(
            (a, b) => (b.rssi ?? -999) - (a.rssi ?? -999),
          );
        });
      },
    );
  }, [stopScan, waitForPoweredOn]);

  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.stopDeviceScan();
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, []);

  return {
    isScanning,
    error,
    devices,
    startScan,
    stopScan,
  };
}
