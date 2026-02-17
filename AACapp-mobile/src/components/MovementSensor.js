import { Accelerometer } from "expo-sensors";

const MOVEMENT_THRESHOLD = 1.2; // g-force to count as real movement (filters jitter)
const STILLNESS_TIMEOUT = 800; // ms of quiet before we consider movement "done"
const TARGET_DISTANCE = 5.0; // metres before scan is armed

let velocity = 0;
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
        fakeBLEScan();
        // Reset for next bout
        distanceTravelled = 0;
        scanArmed = false;
        stillnessTimer = null;
      }, STILLNESS_TIMEOUT);
    }
    return;
  }

  // Device is moving — cancel any stillness countdown
  clearTimeout(stillnessTimer);
  stillnessTimer = null;

  // Integrate acceleration into distance (simple Euler)
  if (lastTimestamp !== null) {
    const dt = (now - lastTimestamp) / 1000; // seconds
    velocity += (magnitude - 1) * 9.81 * dt; // subtract 1g gravity baseline
    distanceTravelled += Math.abs(velocity) * dt;

    if (!scanArmed && distanceTravelled >= TARGET_DISTANCE) {
      scanArmed = true;
      console.log("[Tracker] 5m reached — will scan when device stops.");
    }
  }

  lastTimestamp = now;
};

Accelerometer.setUpdateInterval(100);
const subscription = Accelerometer.addListener(onUpdate);

export const stop = () => subscription.remove();
