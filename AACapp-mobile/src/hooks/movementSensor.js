// import { Accelerometer } from "expo-sensors";

// const MOVEMENT_THRESHOLD = 1.2; // g-force to count as real movement (filters jitter)
// const STILLNESS_TIMEOUT = 800; // ms of quiet before we consider movement "done"
// const TARGET_DISTANCE = 5.0; // metres before scan is armed
// const MAX_VELOCITY = 3.0; //max velocity prevent crashing
// const SCAN_COOLDOWN= 5000; //5seconds per scan so we dont spam logs

// let velocity = 0;
// let lastScanTime= 0;
// let distanceTravelled = 0;
// let lastTimestamp = null;
// let stillnessTimer = null;
// let scanArmed = false;

// const fakeBLEScan = () => {
//   console.log("[BLE] Scanning for nearby devices...");
// };

// const onUpdate = ({ x, y, z }) => {
//   const now = Date.now();
//   const magnitude = Math.sqrt(x * x + y * y + z * z); // total g-force

//   // Device is still — start countdown to trigger scan
//   if (magnitude < MOVEMENT_THRESHOLD) {
//     lastTimestamp = null;
//     velocity = 0;

//     if (scanArmed && !stillnessTimer) {
//       stillnessTimer = setTimeout(() => {
//         console.log(
//           `[Tracker] Stopped after ${distanceTravelled.toFixed(5)}m — scanning.`
//         );

//         //scan cool down
//         const now = Date.now();
//         if(now -lastScanTime < SCAN_COOLDOWN) {
//           stillnessTimer = null;
//           return;
//         }
//         fakeBLEScan();
//         // Reset for next bout
//         distanceTravelled = 0;
//         scanArmed = false;
//         stillnessTimer = null;
//       }, STILLNESS_TIMEOUT);
//     }
//     return;
//   }
// }

//   // Device is moving — cancel any stillness countdown
//   clearTimeout(stillnessTimer);
//   stillnessTimer = null;

//   // Integrate acceleration into distance (simple Euler)
//   if (lastTimestamp !== null) {
//     const dt = (now - lastTimestamp) / 1000; // seconds
//     velocity += (magnitude - 1) * 9.81 * dt; // subtract 1g gravity baseline
// //max velocity
//     velocity =Math.max( -MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));
    
//     distanceTravelled += Math.abs(velocity) * dt;

//     if (!scanArmed && distanceTravelled >= TARGET_DISTANCE) {
//       scanArmed = true;
//       console.log("[Tracker] 5m reached — will scan when device stops.");
//     }
//   }
//   //makes max velocity so it doesn't have problems crashing etc
  

// Accelerometer.setUpdateInterval(100);
// const subscription = Accelerometer.addListener(onUpdate);

// export const stop = () => subscription.remove();

import { Accelerometer } from 'expo-sensors';

const MOVEMENT_THRESHOLD = 1.2;  // g-force to count as real movement (filters jitter)
const STILLNESS_TIMEOUT  = 800;  // ms of quiet before we consider movement "done"
const TARGET_DISTANCE    = 5.0;  // metres before scan is armed
const MAX_VELOCITY       = 3.0;  // clamp to prevent runaway integration
const SCAN_COOLDOWN      = 5000; // ms — don't scan more than once per 5 seconds

let velocity          = 0;
let lastScanTime      = 0;
let distanceTravelled = 0;
let lastTimestamp     = null;
let stillnessTimer    = null;
let scanArmed         = false;
let subscription      = null;

// Injected at start time — defaults to a console stub so the module is safe
// to import even before a real scan function is provided.
let _onTriggerScan = () => {
  console.log('[movementSensor] No scan callback injected — using stub.');
};

const onUpdate = ({ x, y, z }) => {
  const now       = Date.now();
  const magnitude = Math.sqrt(x * x + y * y + z * z);

  // ── Device is still ───────────────────────────────────────────────────────
  if (magnitude < MOVEMENT_THRESHOLD) {
    lastTimestamp = null;
    velocity      = 0;

    if (scanArmed && !stillnessTimer) {
      stillnessTimer = setTimeout(() => {
        const t = Date.now();
        if (t - lastScanTime < SCAN_COOLDOWN) {
          stillnessTimer = null;
          return;
        }

        console.log(
          `[movementSensor] Stopped after ${distanceTravelled.toFixed(2)}m — triggering scan.`
        );

        _onTriggerScan();
        lastScanTime = t;

        distanceTravelled = 0;
        scanArmed         = false;
        stillnessTimer    = null;
      }, STILLNESS_TIMEOUT);
    }
    return;
  }

  // ── Device is moving ──────────────────────────────────────────────────────
  if (stillnessTimer) {
    clearTimeout(stillnessTimer);
    stillnessTimer = null;
  }

  if (lastTimestamp !== null) {
    const dt = (now - lastTimestamp) / 1000;
    velocity += (magnitude - 1) * 9.81 * dt;
    velocity  = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));
    distanceTravelled += Math.abs(velocity) * dt;

    if (!scanArmed && distanceTravelled >= TARGET_DISTANCE) {
      scanArmed = true;
      console.log('[movementSensor] 5 m reached — will scan when device stops.');
    }
  }

  lastTimestamp = now;
};

/**
 * start(onTriggerScan)
 * --------------------
 * Begin listening to the accelerometer.
 *
 * @param {function} onTriggerScan  Called when the sensor decides a BLE scan
 *                                  should fire (device walked ≥5 m then stopped).
 *                                  In your app this will be `startScan` from useBLE.
 */
export function start(onTriggerScan) {
  if (subscription) return; // already running

  if (typeof onTriggerScan === 'function') {
    _onTriggerScan = onTriggerScan;
  }

  Accelerometer.setUpdateInterval(100);
  subscription = Accelerometer.addListener(onUpdate);
  console.log('[movementSensor] Started.');
}

/**
 * stop()
 * ------
 * Remove the accelerometer listener and reset internal state.
 * Call this in your component's cleanup / useEffect return.
 */
export function stop() {
  if (stillnessTimer) {
    clearTimeout(stillnessTimer);
    stillnessTimer = null;
  }
  subscription?.remove();
  subscription      = null;
  velocity          = 0;
  distanceTravelled = 0;
  lastTimestamp     = null;
  scanArmed         = false;
  console.log('[movementSensor] Stopped.');
}