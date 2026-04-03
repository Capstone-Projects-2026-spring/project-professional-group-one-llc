import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import styles from "../styles/appStyles";

function formatRssi(rssi) {
  if (typeof rssi !== "number") {
    return "N/A";
  }
  return `${rssi} dBm`;
}

export default function BeaconScannerPanel({
  isScanning,
  error,
  devices,
  onStartScan,
  onStopScan,
}) {
  const safeDevices = Array.isArray(devices) ? devices : [];

  return (
    <View style={styles.beaconPanelWrap}>
      <View style={styles.beaconPanelHeader}>
        <Text style={styles.beaconPanelTitle}>Beacon Scan</Text>
        <TouchableOpacity
          style={[
            styles.beaconScanButton,
            isScanning && styles.beaconScanButtonStop,
          ]}
          onPress={isScanning ? onStopScan : onStartScan}
        >
          <Text style={styles.beaconScanButtonText}>
            {isScanning ? "Stop Scan" : "Start Scan"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.beaconPanelHint}>
        This tab is only for scan verification. It does not update room
        selection.
      </Text>

      {!!error && <Text style={styles.beaconErrorText}>{error}</Text>}

      <ScrollView
        style={styles.beaconListScroll}
        contentContainerStyle={styles.beaconList}
      >
        {safeDevices.length === 0 ? (
          <Text style={styles.beaconEmptyText}>
            {isScanning
              ? "Scanning... move near your BlueCharm beacon."
              : "No nearby devices yet. Tap Start Scan."}
          </Text>
        ) : (
          safeDevices.map((device) => (
            <View key={device.id} style={styles.beaconCard}>
              <View style={styles.beaconCardTopRow}>
                <Text style={styles.beaconName}>
                  {device.name || "Unnamed BLE Device"}
                </Text>
                {device.isLikelyBlueCharm && (
                  <Text style={styles.beaconTag}>BlueCharm?</Text>
                )}
              </View>

              <Text style={styles.beaconMeta}>ID: {device.id}</Text>
              <Text style={styles.beaconMeta}>
                RSSI: {formatRssi(device.rssi)}
              </Text>
              {typeof device.txPowerLevel === "number" && (
                <Text style={styles.beaconMeta}>
                  Tx Power: {device.txPowerLevel} dBm
                </Text>
              )}
              {!!device.iBeaconUuid && (
                <Text style={styles.beaconMeta}>
                  UUID: {device.iBeaconUuid}
                </Text>
              )}
              {typeof device.iBeaconMajor === "number" && (
                <Text style={styles.beaconMeta}>
                  Major: {device.iBeaconMajor}
                </Text>
              )}
              {typeof device.iBeaconMinor === "number" && (
                <Text style={styles.beaconMeta}>
                  Minor: {device.iBeaconMinor}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
