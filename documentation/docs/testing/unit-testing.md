---
sidebar_position: 1
---
# Unit tests
For each method, one or more test cases.

A test case consists of input parameter values and expected results.

All external classes should be stubbed using mock objects.

# Unit Test Documentation

This document describes what each unit test file covers, how the mocks work, and what behaviors are being verified.

---

## `movementSensor.test.js`

### Purpose
Tests the `movementSensor` module (imported from `../src/hooks/movementSensor`) that uses the Expo Accelerometer to:

- Register an accelerometer listener on module import
- Set the accelerometer update interval
- Track movement until a target travel distance is reached (arming a scan)
- Trigger a BLE scan only after the device becomes still for long enough
- Cancel a pending scan if movement resumes
- Clean up the accelerometer subscription via `stop()`

### Key Testing Techniques Used

#### Fake Timers
The file uses:
- `jest.useFakeTimers()` to control time-based behavior (e.g., stillness timeouts).
- `jest.advanceTimersByTime(ms)` to simulate time passing and trigger timer callbacks.

This is essential because “stillness triggers scan after a timeout” is timer-driven behavior.

#### Mocking `expo-sensors`
The test replaces `expo-sensors` with a mock implementation:

- `Accelerometer.addListener(cb)` is mocked to:
  - Capture the callback (`capturedListener`) so tests can manually feed accelerometer samples.
  - Return a subscription object with `{ remove: mockRemove }` so cleanup can be tested.

- `Accelerometer.setUpdateInterval` is mocked so we can assert it was configured properly.

Mock variables:
- `mockAddListener`: spy for `addListener`
- `mockSetUpdateInterval`: spy for `setUpdateInterval`
- `mockRemove`: spy for `subscription.remove()`
- `capturedListener`: stores the callback passed to `addListener`

#### Loading a Fresh Module Each Test
`movementSensor` has top-level side effects (it registers listeners on import), so each test uses a helper:

- `jest.resetModules()` to reset the Node module cache
- `jest.isolateModules()` to ensure the `require()` happens in an isolated registry

This guarantees each test starts with a clean module state.

---

### Test Setup / Teardown

#### `beforeEach`
- Clears mocks
- Spies on `console.log` to verify logging behavior
- Imports the module fresh via `loadFreshModule()`

#### `afterEach`
- Restores the `console.log` spy

---

### Test Cases

#### 1) Registers accelerometer listener and sets update interval on import
**Test name**
- `registers accelerometer listener and sets update interval on import`

**What it verifies**
- Importing the module calls:
  - `Accelerometer.setUpdateInterval(100)`
  - `Accelerometer.addListener(...)`
- Ensures `capturedListener` is actually a function (the update callback).

**Why it matters**
- Confirms that the module’s top-level initialization is correct and consistent.

---

#### 2) `stop()` removes the accelerometer subscription
**Test name**
- `stop() removes the accelerometer subscription`

**What it verifies**
- Calling `mod.stop()` triggers `subscription.remove()` exactly once.

**Why it matters**
- Prevents memory leaks and duplicated listeners across app screens / lifecycle changes.

---

#### 3) Does NOT scan when still but movement was never armed
**Test name**
- `does NOT scan when the device is still but movement was never armed`

**What it verifies**
- Feeding a “still” sample without ever reaching the target distance does not trigger scanning,
  even after enough time passes.

**Signals used**
- Confirms `console.log` was *not* called with:
  - `[BLE] Scanning for nearby devices...`

**Why it matters**
- Scanning should only happen after “arming” conditions are met (target distance reached).

---

#### 4) After being armed, going still triggers a scan after the stillness timeout
**Test name**
- `after being armed, going still triggers a scan after the stillness timeout`

**What it verifies**
1. Movement samples accumulate enough distance to arm scanning.
2. A log appears indicating arming:
   - `[Tracker] 5m reached — will scan when device stops.`
3. A still sample starts the stillness timer.
4. Before timeout: scan does not occur.
5. After timeout: scan log appears:
   - `[BLE] Scanning for nearby devices...`

**How time is simulated**
- Mocks `Date.now()` so distance calculations have deterministic timestamps.
- Uses a loop that advances `now` by `200ms` per movement sample to simulate sustained movement.

**Why it matters**
- This is the core expected behavior: “travel enough -> wait until still -> scan.”

---

#### 5) If movement resumes, it cancels the stillness timer (no scan)
**Test name**
- `if movement resumes, it cancels the stillness timer (no scan)`

**What it verifies**
1. Arms scanning the same way as the previous test.
2. Starts the stillness timer by going still.
3. Sends a movement sample *before* the stillness timeout completes.
4. Advances time beyond the timeout.
5. Confirms scan did not occur.

**Why it matters**
- Prevents scanning while the device is moving again (correct “debounce” behavior).

---

### Notes / Expectations About the Implementation
These tests assume that `movementSensor`:

- Calls `Accelerometer.setUpdateInterval(100)` on import
- Calls `Accelerometer.addListener(cb)` on import
- Accumulates distance using time deltas (`Date.now()`) and acceleration magnitude
- Arms scanning at `5m` (target distance)
- Triggers scan only after `STILLNESS_TIMEOUT` elapses while “still”
- Cancels stillness timer if movement resumes before the timeout

---

## `useSentenceBuilder.test.js`

### Purpose
Tests the custom hook `useSentenceBuilder` (imported from `../src/hooks/useSentenceBuilder`) which manages a “sentence” as an array of words and exposes actions to:

- Add a word
- Remove the last word
- Clear the sentence
- Speak the sentence (implemented here as an `Alert.alert`)
- Optionally log user events via an `onLogPress` callback

### Key Testing Techniques Used

#### Hook Testing With `renderHook`
The tests use `@testing-library/react-native`:

- `renderHook(() => useSentenceBuilder(...))` to run the hook in a test environment
- `act(() => ...)` to apply state updates safely and ensure React state settles before assertions

#### Mocking `Alert.alert`
When testing `speakSentence`, the tests spy on:

- `Alert.alert` to prevent UI popups and verify calls.

---

### Test Setup

#### `beforeEach`
- `jest.clearAllMocks()` ensures each test starts clean and no previous call counts leak in.

---

### Test Cases

#### 1) Initial sentence is empty
**Test name**
- `initial sentence is empty`

**What it verifies**
- On first render, `sentence` is `[]`.

---

#### 2) `addWord` appends words in order
**Test name**
- `addWord appends words in order`

**What it verifies**
- Adding `"hello"`, then `"world"` results in:
  - `['hello', 'world']`

**Why it matters**
- Sentence ordering must match selection order for accurate speech output.

---

#### 3) `removeLastWord` removes only the last word
**Test name**
- `removeLastWord removes only the last word`

**What it verifies**
- Given `['I', 'like', 'pizza']`, removing last yields:
  - `['I', 'like']`

---

#### 4) `removeLastWord` on empty sentence stays empty (no crash)
**Test name**
- `removeLastWord on empty sentence stays empty (no crash)`

**What it verifies**
- Removing last word on an empty sentence:
  - does not throw
  - keeps `sentence` as `[]`

---

#### 5) `clearSentence` resets sentence to empty
**Test name**
- `clearSentence resets sentence to empty`

**What it verifies**
- After adding `"test"`, calling `clearSentence()` resets to `[]`.

---

#### 6) `speakSentence` does nothing when sentence is empty
**Test name**
- `speakSentence does nothing when sentence is empty`

**What it verifies**
- With an empty sentence, calling `speakSentence()`:
  - does **not** call `Alert.alert`

**Why it matters**
- Avoids confusing UX (no “speaking” popup when nothing exists to speak).

---

#### 7) `speakSentence` alerts joined sentence when not empty
**Test name**
- `speakSentence alerts joined sentence when not empty`

**What it verifies**
- Adding `"hello"`, `"there"` then calling `speakSentence()` triggers:
  - `Alert.alert('Speaking', 'hello there')`

**Why it matters**
- Confirms correct joining behavior and expected “speaking” output.

---

#### 8) Calls `onLogPress` with correct event names and payloads
**Test name**
- `calls onLogPress with correct event names and payloads`

**What it verifies**
When `useSentenceBuilder({ onLogPress })` is used:

- `addWord('hi')` logs:
  - `onLogPress('word_tile', { word: 'hi' })`

- `removeLastWord()` logs:
  - `onLogPress('remove_last_word')`

- `clearSentence()` logs:
  - `onLogPress('clear_sentence')`

- After adding two words and calling `speakSentence()`, logs:
  - `onLogPress('speak_sentence', { sentenceLength: 2 })`

**Why it matters**
- Ensures analytics / logging hooks receive consistent event names and payload shapes.

---

#### 9) Does not crash if `onLogPress` is not provided
**Test name**
- `does not crash if onLogPress is not provided`

**What it verifies**
- Calling all actions without an `onLogPress` callback:
  - does not throw any errors

**Why it matters**
- Makes the hook safe to use in screens/components that do not provide logging.

---

## Summary

- `movementSensor.test.js` focuses on sensor lifecycle + movement/stillness logic, using mocked Expo Accelerometer and controlled timers.
- `useSentenceBuilder.test.js` focuses on sentence state management, speech output behavior (via `Alert.alert`), and optional event logging.