import { Accelerometer } from "expo-sensors";

const MOVEMENT_THRESHOLD = 1.2; // g-force to count as real movement (filters jitter)
const STILLNESS_TIMEOUT = 800; // ms of quiet before we consider movement "done"
const TARGET_DISTANCE = 5.0; // metres before scan is armed
const MAX_VELOCITY = 3.0; //max velocity prevent crashing
const SCAN_COOLDOWN = 5000; //5seconds per scan so we dont spam logs

let velocity = 0;
let lastScanTime = 0;
let distanceTravelled = 0;
let lastTimestamp = null;
let stillnessTimer = null;
let scanArmed = false;

const fakeBLEScan = () => {
  console.log("[BLE] Scanning for nearby devices...");
};

const onUpdate = ({ x, y, z }) => {
  const now = Date.now();
  const magnitude = Math.sqrt(x * x + y * y + z * z); // total g-force

  // Device is still — start countdown to trigger scan
  if (magnitude < MOVEMENT_THRESHOLD) {
    lastTimestamp = null;
    velocity = 0;

    if (scanArmed && !stillnessTimer) {
      stillnessTimer = setTimeout(() => {
        console.log(
          `[Tracker] Stopped after ${distanceTravelled.toFixed(5)}m — scanning.`
        );

        //scan cool down
        const now = Date.now();
        if (now - lastScanTime < SCAN_COOLDOWN) {
          stillnessTimer = null;
          return;
        }
        fakeBLEScan();
        //lastScanTime = now;
        // Reset for next bout
        distanceTravelled = 0;
        scanArmed = false;
        stillnessTimer = null;
      }, STILLNESS_TIMEOUT);
    }
    return;
  }


  //   //moving: above threshold

  //   //cancel any stillness countdown because movement resumed
  //   if (stillnessTimer){
  //     clearTimeout(stillnessTimer);
  //     stillnessTimer = null;
  //   }

  //   //prime the interogator
  //   //first moving sample just sets the timestamp so next sample has a dt
  //   if(lastTimestamp == null){
  //     lastTimestamp = now;
  //     return;
  //   }

  //   //integrate acceleration into distance (euler)
  //   const dt = (now - lastTimestamp) / 1000; //seconds

  //   //subtract 1g gravity baseline to approximate extra acceleration due to motion
  //   velocity += (magnitude - 1) * 9.81 * dt;

  //   //clamp velocity to avoid runaway spikes/numerical weirdness
  //   velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));

  //   //distance = integral of |v|
  //   distanceTravelled += Math.abs(velocity) * dt;

  //   //arm scan once target distance reached
  //   if(!scanArmed && distanceTravelled >= TARGET_DISTANCE){
  //     scanArmed = true;
  //     console.log("[Tracker] 5m reached — will scan when device stops.");
  //   }

  //   lastTimestamp = now;
};

// Device is moving — cancel any stillness countdown
clearTimeout(stillnessTimer);
stillnessTimer = null;

// Integrate acceleration into distance (simple Euler)
if (lastTimestamp !== null) {
  const dt = (now - lastTimestamp) / 1000; // seconds
  velocity += (magnitude - 1) * 9.81 * dt; // subtract 1g gravity baseline
  //max velocity
  velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));

  distanceTravelled += Math.abs(velocity) * dt;

  if (!scanArmed && distanceTravelled >= TARGET_DISTANCE) {
    scanArmed = true;
    console.log("[Tracker] 5m reached — will scan when device stops.");
  }
}
//makes max velocity so it doesn't have problems crashing etc


Accelerometer.setUpdateInterval(100);
const subscription = Accelerometer.addListener(onUpdate);

export const stop = () => subscription.remove();
