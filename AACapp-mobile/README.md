# AACapp-mobile Beacon Integration

## PR Summary
This update adds end-to-end BLE beacon support for iPhone development builds.

Implemented capabilities:
1. Beacon Scan tab for live BLE verification.
2. Auto Beacon mode to switch room context automatically in the top right.
3. In-app room-switch notification pops when auto switching occurs.
5. Identifier-only room mapping (beaconId).

---

## What Was Implemented

### 1) Beacon Scan Tab
Files:
- `App.js`
- `src/components/BeaconScannerPanel.js`
- `src/styles/appStyles.js`

Behavior:
1. Start/Stop scan from the UI.
2. Shows discovered devices with:
   - name
   - device ID
   - RSSI (dBm)
   - Tx Power (if provided)
   - iBeacon UUID/Major/Minor (if parse succeeds)
3. Empty/error states for scan feedback.

### 2) BLE Scanner Hook
File:
- `src/hooks/useBeaconScanner.js`

Behavior:
1. Uses `react-native-ble-plx` to scan.
2. Manages BLE lifecycle and cleanup.
3. Sorts discovered devices by strongest RSSI.
4. Waits for Bluetooth `PoweredOn` before scanning (fixes first-tap unknown-state race).
5. Attempts iBeacon parsing from manufacturer data.
6. Uses robust payload decoding fallbacks for variable runtime formats.

### 3) Auto Beacon Room Switching
Files:
- `App.js`
- `src/components/AppHeader.js`
- `src/data/roomContexts.js`

Behavior:
1. Header toggle: `Auto Beacon: ON/OFF`.
2. When ON, strongest matched beacon triggers room update.
3. Manual room selector remains as fallback.
4. Interaction logs still capture beacon-based room switching.

### 4) Room Switch Notification
Files:
- `App.js`
- `src/styles/appStyles.js`

Behavior:
1. Shows a short banner when auto-switch happens.
2. Example: `Switched to 🛏️ Bedroom`.
3. Auto-hides after about 2.2 seconds.

### 5) iOS Permissions
Files:
- `app.json`
- `ios/AACappmobile/Info.plist`

Behavior:
1. Adds required Bluetooth usage descriptions for iOS runtime permission prompts.

### 6) Dependency Added
Files:
- `package.json`
- `package-lock.json`

Dependency:
- `react-native-ble-plx`

---

## Current Mapping Model
File:
- `src/data/roomContexts.js`

Current rules:

2. Optional `beaconMajor` and `beaconMinor` are used when iBeacon fields are available.
3. In iBeacon, major and minor are sub-identifiers under the same UUID.

Think of it like:

UUID = organization/group
Major = subgroup/location
Minor = specific beacon/unit
So if multiple beacons share one UUID, major and minor let you tell them apart.

Current Bedroom mapping in roomContexts.js:
1. `beaconId: 76BD86D3-F85B-C47B-2F32-EA3B86D6AC22`
2. `beaconMajor: 3838`
3. `beaconMinor: 4949`

How to map a different beacon (currently, I assigned the BCPro2 beacon with its id to the bedroom.):
1. Scan in Beacon Scan tab.
2. Copy the device `ID` from the card.
3. Update the target room's `beaconId` in `src/data/roomContexts.js`.
4. Rebuild iOS app if required.

---

## Run + Setup (macOS + iPhone)

Prerequisites:
1. Xcode installed.
2. Apple signing available.
3. iPhone connected (usb c) and trusted.
4. Developer Mode enabled on iPhone.

Steps (make sure iPhone is unlocked and on homescreen):
1. `cd AACapp-mobile`
2. `npm install`
3. `npx pod-install ios`
4. `npx expo run:ios --device`
5. Select a physical iPhone in device picker (not simulator).
6. Open app on iPhone.

Optional live dev loop:
- `npx expo start --dev-client`

Verification:
1. Open Beacon Scan tab.
2. Tap Start Scan.
3. Confirm your beacon appears.
4. Toggle Auto Beacon ON.
5. Confirm room switches and toast appears.

---

## Windows + iPhone Teammates
Windows cannot build iOS locally with Xcode.

Use one of these:
1. EAS Development Build
   - `npm install -g eas-cli`
   - `eas login`
   - `cd AACapp-mobile`
   - `eas build:configure`
   - `eas build -p ios --profile development`
2. TestFlight distribution from a Mac-built upload.

### Windows Troubleshooting
If a Windows teammate cannot run the iOS app, use this checklist:

1. `expo run:ios` fails or is unavailable on Windows:
   - Expected behavior. iOS local builds require macOS + Xcode.
2. EAS build does not install on iPhone:
   - Make sure build profile is `development` for dev-client testing.
   - Open install link directly on iPhone.
3. App installs but beacon scan does not work:
   - Confirm they are not using Expo Go.
   - Use the generated development build app or TestFlight app.
4. Build succeeds but app cannot connect to local Metro:
   - For remote/cloud-built app, either use bundled/TestFlight flow or ensure same network and correct dev-client setup.
5. Signing/provisioning errors during EAS iOS build:
   - Ensure Apple Developer access is configured in Expo account/project credentials.

Recommended Windows path for this project:
1. Use EAS iOS development builds for testing.
2. Use TestFlight for broader teammate testing.
3. Keep a Mac maintainer in the loop for iOS-native dependency/signing issues.

---

## Device Picker Notes
When running `npx expo run:ios --device`:
1. Physical devices appear with real names (for example, `Jun's iPhone`).
2. Simulator entries (for example, `iPhone 17 Pro`) do not support BLE beacon testing.
3. Teammates must connect/trust/pair their own iPhone on their own Mac for it to appear.

---

## Apple Signing Troubleshooting (macOS + iPhone)
Apple signing means Xcode must have a valid Team/certificate/profile so the app can install on a real iPhone.

If teammate cannot run on device, do this:
1. Open Xcode -> Settings -> Accounts and sign in with Apple ID.
2. Open `ios/AACappmobile.xcworkspace` in Xcode.
3. Select target `AACappmobile` -> Signing & Capabilities.
4. Choose a valid Team.
5. Enable `Automatically manage signing`.
6. Reconnect iPhone via cable, unlock it, tap `Trust This Computer`.
7. Confirm iPhone Developer Mode is ON:
   - iPhone Settings -> Privacy & Security -> Developer Mode
8. In Xcode, open Window -> Devices and Simulators and make sure the phone is paired.
9. Re-run:
   - `npx pod-install ios`
   - `npx expo run:ios --device`

Common errors and fixes:
1. `No signing certificate`:
   - Sign into Xcode account and select Team in Signing & Capabilities.
2. `Provisioning profile doesn't include device`:
   - Keep `Automatically manage signing` ON and rebuild with iPhone connected.
3. iPhone not listed in Expo picker:
   - Reconnect cable, unlock phone, trust Mac, confirm device appears in Xcode Devices window.
4. Build succeeds but app won't launch:
   - Check Developer Mode on iPhone and accept any first-launch prompts.

---

## Known Limitations
1. iBeacon UUID/Major/Minor display depends on advertisement payload visibility in scan callbacks.
2. Device ID (I originally used UUID not ID but it doesnt work) matching is currently the most reliable path in this project flow.
3. BLE beacon behavior is not testable in iOS simulator.

---


