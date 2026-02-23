---
sidebar_position: 3
---

# Internal Code Contracts
(documented following the [Javadoc to Markdown](https://delight-im.github.io/Javadoc-to-Markdown/) convention)

---

## `roomContexts.js`

### `const ROOM_CONTEXTS`

The central data store mapping room identifiers to their AAC suggestion vocabularies. Each key is a room identifier string; each value is a Room object containing display metadata, a Bluetooth beacon placeholder UUID, and an ordered list of AAC word/phrase suggestions. This is the single source of truth consumed by all other modules.

### Room object fields

#### `public String id`

Unique room identifier used as the lookup key throughout the application (e.g. `'kitchen'`, `'bathroom'`). Will map to a physical space when BLE beacons are deployed.

#### `public String label`

Human-readable display name rendered in the RoomSelector chip and any caregiver-facing UI.

#### `public String emoji`

Single emoji character representing the room. Displayed alongside the label in the room chip.

#### `public String color`

Hex colour string (e.g. `'#FF9F43'`) applied to the active chip background and border in RoomSelector.

#### `public String beaconId`

Placeholder UUID for the physical Bluetooth beacon assigned to this room. Replace with a real UUID when beacons are programmed. Used as the lookup key in `getRoomByBeaconId()`.

#### `public Array<Suggestion> suggestions`

Ordered list of AAC word/phrase objects rendered as buttons in the active room context. Each item contains a `label` (string) and `emoji` (string).

---

### `public getRoomByBeaconId(beaconId)`

Looks up and returns a room context object by its Bluetooth beacon UUID. This is the primary function called by the BLE detection layer when a physical beacon advertisement is received.

- **Pre-conditions:** `beaconId` is a non-null, non-empty string. `ROOM_CONTEXTS` has been initialised at module load.
- **Post-conditions:** Returns the matching Room object if `beaconId` equals a room's `beaconId` field. Returns `null` if no room matches. `ROOM_CONTEXTS` is not mutated.
- **Parameters:** `beaconId` — `String` the UUID string emitted by the BLE beacon advertisement
- **Returns:** `Room | null` — the matching room context object, or `null` if not found

```js
const room = getRoomByBeaconId('beacon-kitchen-001');
// Returns: { id: 'kitchen', label: 'Kitchen', emoji: '🍳', ... }

const unknown = getRoomByBeaconId('beacon-unknown-999');
// Returns: null
```

---

### `public getAllRooms()`

Returns all defined room context objects as a flat array. Used by the manual room picker (RoomSelector) to populate the chip list, and by `useLocationDetection` to resolve a room ID to a full object.

- **Pre-conditions:** `ROOM_CONTEXTS` has been initialised at module load.
- **Post-conditions:** Returns an array containing every Room object. Order reflects `Object.values()` insertion order. `ROOM_CONTEXTS` is not mutated.
- **Parameters:** none
- **Returns:** `Array<Room>` — all room context objects

```js
const rooms = getAllRooms();
// Returns: [{ id: 'kitchen' }, { id: 'bathroom' }, { id: 'bedroom' }, ...]
```

---
---

## `useLocationDetection.js`

### `public function useLocationDetection()`

React hook providing a unified abstraction layer for room and location detection. Today the hook implements manual room selection as a BLE placeholder. Its public return shape is intentionally stable so that swapping the detection mechanism from manual to Bluetooth requires no changes in any consuming component.

- **Author:** AAC App Team

### `private Room | null currentRoom`

React state variable holding the currently active room context object. Initialised to `null` (no room selected). Updated by `setRoomManually()` or, once integrated, by the BLE beacon scanning effect.

### `public String detectionMode`

Read-only indicator of the active detection strategy. Returns `'manual'` until BLE is integrated, at which point it should be updated to `'bluetooth'`. Consuming components may use this to conditionally show or hide the manual RoomSelector.

---

### `public setRoomManually(roomId)`

Sets the active room by matching the provided room ID against all rooms returned by `getAllRooms()`. Wrapped in `useCallback` to maintain referential stability across renders and avoid unnecessary re-renders in child components.

- **Pre-conditions:** `getAllRooms()` returns a valid array of Room objects. `roomId` is either a string matching a known `room.id` value, or `null`.
- **Post-conditions:** `currentRoom` state is updated to the matched Room object, triggering a re-render. If `roomId` is `null` or no match is found, `currentRoom` is set to `null`.
- **Parameters:** `roomId` — `String | null` the `id` field of the target room, or `null` to clear the active room
- **Returns:** `void`

```js
const { setRoomManually } = useLocationDetection();

setRoomManually('kitchen'); // currentRoom → { id: 'kitchen', label: 'Kitchen', ... }
setRoomManually(null);      // currentRoom → null
setRoomManually('invalid'); // currentRoom → null (no match found)
```

---

### Return value

`useLocationDetection()` returns an object with the following shape:

| Property | Type | Description |
|---|---|---|
| `currentRoom` | `Room \| null` | The active room context, or `null` if no room is selected |
| `detectionMode` | `'manual' \| 'bluetooth'` | Current detection strategy |
| `setRoomManually` | `(roomId: string \| null) => void` | Callback to set the active room by ID |
| `allRooms` | `Array<Room>` | Snapshot of all room definitions from `roomContexts` |

---

### Future BLE integration

When BLE is ready, add a `useEffect` inside this hook that starts beacon scanning, calls `getRoomByBeaconId(beacon.uuid)` on each advertisement, and calls `setCurrentRoom(room)`. Return a cleanup function that stops the scan. The hook's return shape does not change.

---
---

## `RoomSelector.js`

### `public function RoomSelector({ rooms, activeRoomId, onSelectRoom })`

A horizontally scrollable row of room chips that lets the user manually simulate entering a room. Serves as the placeholder UI for automatic Bluetooth beacon detection. Once BLE is integrated, this component can be hidden or repurposed as a manual override fallback.

- **Author:** AAC App Team

### Props

#### `public Array<Room> rooms`

Array of room objects to render as selectable chips. Each object must contain at minimum `id`, `label`, `emoji`, and `color`. Supplied by the parent via `useLocationDetection().allRooms`.

#### `public String | null activeRoomId`

The `id` of the currently active room. When `null`, the General chip is shown as active. When set to a valid room ID, the corresponding chip is highlighted using `room.color`.

#### `public Function onSelectRoom`

Callback fired when any chip is tapped. Receives the selected room's `id` string, or `null` when the General chip is tapped. Should be a stable reference (e.g. `useCallback`-wrapped `setRoomManually`).

---

### `public onPress(roomId)`

Internal press handler attached to each chip via `TouchableOpacity`. Calls `onSelectRoom(room.id)` for a room chip, or `onSelectRoom(null)` for the General chip.

- **Pre-conditions:** `onSelectRoom` is a non-null function. `roomId` is either a valid `room.id` string or `null`.
- **Post-conditions:** `onSelectRoom` is invoked exactly once with the correct argument. No internal state is modified — the component is fully controlled.
- **Parameters:** `roomId` — `String | null` passed directly to `onSelectRoom`
- **Returns:** `void`

---

### Rendered elements

**General chip** — always present as the first chip; tapping calls `onSelectRoom(null)` and applies a purple (`#6C63FF`) active style when `activeRoomId` is `null`.

**Room chips** — one per entry in `rooms`; the chip matching `activeRoomId` has its background and border set to `room.color`. All other chips use the default neutral style.

---
---

## `movementSensor.js`

### Overview

Module that detects user movement via the device accelerometer (`expo-sensors`) and triggers a mock BLE scan after the user has walked approximately 5 metres and then stopped. Acts as the bridge between physical movement and location re-detection, minimising unnecessary BLE radio activity.

- **Author:** AAC App Team

### Configuration constants

#### `const MOVEMENT_THRESHOLD = 1.2`

Minimum total g-force magnitude required to count as real movement. Readings below this value are treated as stillness and filter out micro-jitter from a stationary device.

#### `const STILLNESS_TIMEOUT = 800`

Milliseconds of continuous sub-threshold readings required before the stillness callback fires and a BLE scan is triggered.

#### `const TARGET_DISTANCE = 5.0`

Estimated displacement in metres required to arm a BLE scan. Once `distanceTravelled` reaches this value, `scanArmed` is set to `true`.

#### `const MAX_VELOCITY = 3.0`

Maximum allowable velocity in m/s. Clamps the integrated velocity value to prevent runaway accumulation from sensor noise spikes.

#### `const SCAN_COOLDOWN = 5000`

Minimum interval in milliseconds between consecutive calls to `fakeBLEScan()`. Prevents log spam and excessive BLE radio activity.

### Module-level state variables

#### `private number velocity`

Integrated velocity estimate (m/s) updated on each accelerometer sample. Clamped to `[-MAX_VELOCITY, MAX_VELOCITY]`. Reset to `0` when the device is still.

#### `private number distanceTravelled`

Running total displacement estimate in metres since the last reset. Reset to `0` after a scan is triggered.

#### `private number | null lastTimestamp`

Timestamp in milliseconds of the previous accelerometer sample, used to compute `dt` for Euler integration. Set to `null` when the device is still.

#### `private boolean scanArmed`

Set to `true` once `distanceTravelled >= TARGET_DISTANCE`. Indicates the module is waiting for the device to stop before triggering a BLE scan.

#### `private TimeoutID | null stillnessTimer`

Reference to the pending stillness `setTimeout`. Cleared immediately if motion above `MOVEMENT_THRESHOLD` is detected, preventing premature scan triggers.

#### `private number lastScanTime`

Timestamp in milliseconds of the most recent `fakeBLEScan()` call. Used to enforce `SCAN_COOLDOWN` between scans.

---

### `private fakeBLEScan()`

Placeholder function representing a Bluetooth beacon scan. Logs `[BLE] Scanning for nearby devices...` to the console. Will be replaced by a real BLE radio scan call when Bluetooth integration is complete.

- **Pre-conditions:** none
- **Post-conditions:** Console log is emitted. No state is modified.
- **Parameters:** none
- **Returns:** `void`

---

### `private onUpdate({ x, y, z })`

Accelerometer event handler invoked at 100 ms intervals. Computes total g-force magnitude and drives the armed/stillness state machine. Integrates acceleration into velocity and displacement using simple Euler integration.

- **Pre-conditions:** Accelerometer subscription is active. `x`, `y`, `z` are valid floating-point g-force readings from `expo-sensors`.
- **Post-conditions:** `distanceTravelled` is updated based on elapsed time and estimated velocity. `scanArmed` becomes `true` when `distanceTravelled >= TARGET_DISTANCE`. `fakeBLEScan()` is called after `STILLNESS_TIMEOUT` ms of sub-threshold readings, subject to `SCAN_COOLDOWN`. `velocity` is always clamped to `[-MAX_VELOCITY, MAX_VELOCITY]`. `stillnessTimer` is cancelled immediately upon detecting motion.
- **Parameters:** `{ x, y, z }` — `AccelerometerData` raw 3-axis accelerometer readings in g-force units
- **Returns:** `void`
- **Throws:** No exceptions thrown directly; malformed sensor data may produce `NaN` velocity values if `x`, `y`, or `z` are non-numeric.

---

### `public stop()`

Removes the accelerometer event subscription, halting all sensor callbacks and preventing memory leaks when the module is unloaded.

- **Pre-conditions:** The accelerometer subscription was successfully created at module load.
- **Post-conditions:** `onUpdate` is no longer called. The subscription object is cleaned up by `expo-sensors` internals.
- **Parameters:** none
- **Returns:** `void`

```js
import { stop } from './movementSensor';

// Call on component unmount to prevent memory leaks
useEffect(() => {
  return () => stop();
}, []);
```

---

### Known issues

At the top level, all exceptions should be caught and a meaningful error message presented to the user. The following issues must be resolved before production use:

- **Structural bug:** The motion-detection block (`clearTimeout`, Euler integration) currently sits outside the `onUpdate` function body due to a missing closing brace. This causes a runtime error and must be corrected before any sensor data is processed.
- **Integration drift:** Simple Euler integration accumulates error rapidly on consumer-grade accelerometers. A complementary or Kalman filter should replace this approach for reliable distance estimation.
- **Singleton state:** Module-level mutable variables (`velocity`, `distanceTravelled`, etc.) mean this module cannot support multiple concurrent sensor sessions.
