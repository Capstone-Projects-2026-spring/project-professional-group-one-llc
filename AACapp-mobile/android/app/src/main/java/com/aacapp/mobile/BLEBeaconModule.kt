package com.aacapp.mobile

import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class BLEBeaconModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BLEBeaconModule"
        private const val APPLE_MANUFACTURER_ID = 0x004C
        // iBeacon type (0x02) + length (0x15) — hardware filter prefix
        private val IBEACON_PREFIX      = byteArrayOf(0x02, 0x15)
        private val IBEACON_PREFIX_MASK = byteArrayOf(0xFF.toByte(), 0xFF.toByte())
    }

    private var scanCallback: ScanCallback? = null
    private var isScanning = false

    override fun getName() = "BLEBeaconModule"

    @ReactMethod
    fun startScan() {
        
        
        Log.d(TAG, "startScan() called")  // ADD THIS
        android.util.Log.d("BLEBeaconModule", "startScan() called via Log")  // ADD THIS
        if (isScanning) {
            Log.d(TAG, "Already scanning")
            return
        }

        val btManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter   = btManager?.adapter

        if (adapter == null || !adapter.isEnabled) {
            sendError("Bluetooth is off or unavailable")
            return
        }

        val scanner = adapter.bluetoothLeScanner
        if (scanner == null) {
            sendError("BluetoothLeScanner not available")
            return
        }

        // ── Hardware-level ScanFilter ────────────────────────────────────────
        // This is the key difference vs ble-plx userspace scanning.
        // setManufacturerData passes the filter to the BLE chip directly.
        // The chip returns matching packets WITH full manufacturer data intact,
        // before Android 12+ userspace stripping ever runs.
        // nRF Connect, KBeacon app, and AltBeacon all use this same API.
        val filter = ScanFilter.Builder()
            .setManufacturerData(APPLE_MANUFACTURER_ID, IBEACON_PREFIX, IBEACON_PREFIX_MASK)
            .build()

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
            //.setLegacy(true) // iBeacons use legacy BLE advertisements
            .setReportDelay(1000)
            .build()

        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                parseScanResult(result)
            }

            override fun onBatchScanResults(results: List<ScanResult>) {
                results.forEach { parseScanResult(it) }
            }

            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "Scan failed: $errorCode")
                sendError("Scan failed with error code: $errorCode")
                isScanning = false
            }
        }

        //scanner.startScan(listOf(filter), settings, scanCallback!!)
        scanner.startScan(null, settings, scanCallback!!)
        isScanning = true
        Log.d(TAG, "iBeacon scan started with hardware manufacturer filter")
    }

    @ReactMethod
    fun stopScan() {
        if (!isScanning) return
        val btManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val scanner   = btManager?.adapter?.bluetoothLeScanner
        scanCallback?.let { scanner?.stopScan(it) }
        scanCallback = null
        isScanning   = false
        Log.d(TAG, "iBeacon scan stopped")
    }

    // Required for RN event emitter
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ── Parse iBeacon packet ─────────────────────────────────────────────────
    private fun parseScanResult(result: ScanResult) {
        val record  = result.scanRecord ?: return
        val allMfrIds = record.manufacturerSpecificData
        Log.d(TAG, "Packet: mac=${result.device.address} rssi=${result.rssi} mfrIds=${(0 until allMfrIds.size()).map { allMfrIds.keyAt(it).toString(16) }}")
        // getManufacturerSpecificData() returns data WITHOUT the company ID prefix
        // so index 0 = iBeacon type (0x02), index 1 = length (0x15)
        val mfrData = record.getManufacturerSpecificData(APPLE_MANUFACTURER_ID) ?: return
        if (mfrData != null) {
            Log.d(TAG, "Apple packet: mac=${result.device.address} rssi=${result.rssi} type=0x${mfrData[0].toInt().and(0xFF).toString(16)} len=${mfrData.size}")
        }
        if (mfrData.size < 23) return
        if (mfrData[0] != 0x02.toByte() || mfrData[1] != 0x15.toByte()) return

        val uuidBytes = mfrData.slice(2..17).toByteArray()
        val uuid      = bytesToUUID(uuidBytes)
        val major     = ((mfrData[18].toInt() and 0xFF) shl 8) or (mfrData[19].toInt() and 0xFF)
        val minor     = ((mfrData[20].toInt() and 0xFF) shl 8) or (mfrData[21].toInt() and 0xFF)
        val txPower   = mfrData[22].toInt()
        val rssi      = result.rssi
        val mac       = result.device.address

        Log.d(TAG, "✅ iBeacon: uuid=$uuid major=$major minor=$minor rssi=$rssi")

        val event = Arguments.createMap().apply {
            putString("uuid", uuid)
            putInt("major", major)
            putInt("minor", minor)
            putInt("rssi", rssi)
            putInt("txPower", txPower)
            putString("mac", mac)
        }
        sendEvent("onBeaconDetected", event)
    }

    private fun bytesToUUID(b: ByteArray): String =
        String.format(
            "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
            b[0], b[1], b[2],  b[3],
            b[4], b[5], b[6],  b[7],
            b[8], b[9], b[10], b[11],
            b[12],b[13],b[14], b[15]
        ).uppercase()

    private fun sendEvent(name: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    private fun sendError(message: String) {
        val event = Arguments.createMap().apply { putString("message", message) }
        sendEvent("onBeaconError", event)
    }
}