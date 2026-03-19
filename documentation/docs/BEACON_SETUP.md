# BLE Beacon — Developer Machine Setup Guide

Your copy of the codebase already has all the changes needed to support
beacon detection. This guide is purely about getting your machine ready
to build and run the app.

---

## Why This Setup Is Needed

The app uses `react-native-ble-plx` to scan for the Blue Charm BC021
iBeacon. This library requires native Android code, which means:

- **Expo Go will not work.** Expo Go is a sandboxed app that can't load
  custom native modules. You'll get no error — BLE just silently does
  nothing. You must run a Development Build instead (what `npx expo run:android` produces).

- **The build toolchain has strict requirements.** React Native's Gradle
  build system requires exactly Java 17. Java 21, 23, or any other
  version will crash the build. The Android SDK location also needs to
  be set as an environment variable or Gradle won't know where to find it.

---

## Step 1 — Install Android Studio

Download and install from: https://developer.android.com/studio

Use the default installation options. This gives you the Android SDK,
emulator, ADB, and Gradle — everything the build needs.

---

## Step 2 — Set Up a Device to Run the App On

**Option A — Android Emulator (no physical device needed)**

1. Open Android Studio → **Tools → Device Manager** → **Create Device**
2. Pick **Pixel 6** → Next
3. Select a system image — **API 34 or higher** (click Download next to
   it if needed, wait for it to finish) → Next → Finish
4. Press **▶ Play** next to the device to start it
5. Wait for the Android home screen to fully appear before building

**Option B — Real Android Phone**

1. On your phone: **Settings → About Phone** → tap **Build Number** 7 times
2. **Settings → Developer Options** → turn on **USB Debugging**
3. Plug the phone into your PC via USB
4. When the phone asks "Allow USB Debugging?" → tap **Allow**
5. Verify your PC sees it — open a terminal and run:
   ```
   adb devices
   ```
   You should see your device listed as `device` (not `unauthorized`).
   If it says `unauthorized`, check your phone screen for a popup.

---

## Step 3 — Install Java 17

React Native requires **exactly Java 17**. Any other version (21, 23, etc.)
will break the Gradle build with a cryptic error.

**a) Download Temurin Java 17 (free):**
https://adoptium.net/temurin/releases/?version=17
Pick: Windows x64 → .msi installer → install it.

**b) Point Android Studio at Java 17:**
- In Android Studio: **File → Settings → Build, Execution, Deployment
  → Build Tools → Gradle → Gradle JDK**
- Browse to:
  ```
  C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot
  ```
  Alternatively use Android Studio's own bundled JDK at:
  ```
  C:\Program Files\Android\Android Studio\jbr
  ```
- Click OK

**c) Set JAVA_HOME (so the terminal also uses Java 17):**
- Press **Windows key** → search **"environment variables"**
- Click **"Edit the system environment variables"** → **Environment Variables...**
- Under **System variables**:
  - Click **New**:
    - Variable name: `JAVA_HOME`
    - Variable value: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot`
  - Find **Path** → click **Edit** → click **New** and add:
    ```
    C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot\bin
    ```
  - While in the Path list, **delete any entries** pointing to Java 21,
    Java 23, or anything else that isn't Java 17
- Click OK → OK → OK

**d) Verify — open a brand new terminal and run:**
```
java -version
```
It must say `openjdk version "17.x.x"`. If it still shows the wrong
version, there is still an old Java entry in your Path that needs removing.

---

## Step 4 — Set ANDROID_HOME

Gradle needs to know where your Android SDK is installed.

The SDK is usually at:
```
C:\Users\<your-username>\AppData\Local\Android\Sdk
```
Open File Explorer and confirm that folder exists before continuing.

- Press **Windows key** → search **"environment variables"**
- Click **"Edit the system environment variables"** → **Environment Variables...**
- Under **System variables**:
  - Click **New**:
    - Variable name: `ANDROID_HOME`
    - Variable value: `C:\Users\<your-username>\AppData\Local\Android\Sdk`
  - Find **Path** → click **Edit** → add these two new entries:
    ```
    C:\Users\<your-username>\AppData\Local\Android\Sdk\platform-tools
    C:\Users\<your-username>\AppData\Local\Android\Sdk\tools
    ```
- Click OK → OK → OK

**Verify — open a brand new terminal and run:**
```powershell
echo $env:ANDROID_HOME
```
It should print the SDK path above.

---

## Step 5 — Build and Run the App

Make sure your emulator is running (home screen visible) or your phone
is plugged in, then open a terminal, navigate to the project folder, and run:

```bash
npx expo run:android
```

This compiles the native code and installs the app on your device.
It will take a few minutes the first time. After that, re-runs are faster.

> **PowerShell note:** if you ever need to run Gradle directly and get
> `'gradlew.bat' is not recognized`, prefix it with `.\`:
> ```powershell
> cd android
> .\gradlew.bat app:assembleDebug
> ```

---

## Step 6 — Verify the Beacon Hook Is Working

The hook ships with simulation mode on by default (`SIMULATE_BEACON = true`
in `useBeaconDetection.js`), so you don't need the physical beacon to test.

Once the app is running, watch the terminal for these three log lines:

```
[Beacon] SIMULATION MODE — no real hardware needed.    ← appears on launch
[Beacon] Detected! RSSI=-62, room="living_room"        ← appears after 2 seconds
[Beacon] SIMULATION: beacon left range.                ← appears after 15 seconds
```

The room displayed in the app header should switch automatically when the
second line appears. If you don't see the logs in the main terminal, run
this in a separate terminal:

```bash
adb logcat *:S ReactNativeJS:V
```

---

## How the BC021 Beacon Detection Actually Works

This section explains the technical choices inside `useBeaconDetection.js`
so the team understands what the hook is doing and why.

**Simulation mode**

`SIMULATE_BEACON = true` at the top of the hook makes it behave as if a
beacon is detected 2 seconds after the app mounts, then "leaves" after 15
seconds. This lets you test the full room-switching flow without any
hardware. Set it back to `false` for production or real-device testing.

**Why iBeacons are invisible to normal BLE scans**

The BC021 broadcasts using Apple's iBeacon format. Its identity (UUID,
Major, Minor) lives inside the `manufacturerData` field of the BLE
advertisement packet — not in a standard GATT service UUID. This causes
two common mistakes:

- You cannot filter by `serviceUUIDs: ['...']` — iBeacons have no GATT
  service advertisement. Passing a UUID filter silently excludes the beacon
  before your code ever sees it.
- You must scan with `serviceUUIDs: null` to receive all nearby devices,
  then parse the raw `manufacturerData` payload yourself to find Apple's
  company ID (`0x004C`) and the iBeacon subtype byte (`0x02`).

The hook handles this parsing automatically via `parseIBeacon()`.

The beacon may also advertise as "non-connectable" — this is normal and
expected. You do not need to connect to it, just scan passively.

**How to find your beacon's UUID, Major, and Minor**

- Install the **Blue Charm Beacons** app on your Android phone
- Stand next to the BC021 and open the app
- Tap the beacon in the list → **Beacon Detail**
- Copy the UUID, Major, and Minor values
- Paste them into `BEACON_CONFIG` in `useBeaconDetection.js`

**Android permissions**

The hook requests the correct permissions automatically depending on OS version:

- Android 12+ (API 31+): `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` + `ACCESS_FINE_LOCATION`
- Android 11 and below: `ACCESS_FINE_LOCATION` only

---

## Step 7 — Switching to the Real Beacon (when hardware is available)

1. Set `SIMULATE_BEACON = false` in `useBeaconDetection.js`
2. Install the **Blue Charm Beacons** app on your Android phone
3. Stand next to the BC021 beacon → tap it in the list → **Beacon Detail**
4. Copy the **UUID**, **Major**, and **Minor** values
5. Paste them into `BEACON_CONFIG` in `useBeaconDetection.js`
6. Set `roomId` to match a room ID from `roomContexts.js`
7. Rebuild: `npx expo run:android`
