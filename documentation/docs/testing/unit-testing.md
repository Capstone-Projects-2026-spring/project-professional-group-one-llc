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

This is essential because "stillness triggers scan after a timeout" is timer-driven behavior.

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
- Confirms that the module's top-level initialization is correct and consistent.

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
- Feeding a "still" sample without ever reaching the target distance does not trigger scanning,
  even after enough time passes.

**Signals used**
- Confirms `console.log` was *not* called with:
  - `[BLE] Scanning for nearby devices...`

**Why it matters**
- Scanning should only happen after "arming" conditions are met (target distance reached).

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
- This is the core expected behavior: "travel enough -> wait until still -> scan."

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
- Prevents scanning while the device is moving again (correct "debounce" behavior).

---

### Notes / Expectations About the Implementation
These tests assume that `movementSensor`:

- Calls `Accelerometer.setUpdateInterval(100)` on import
- Calls `Accelerometer.addListener(cb)` on import
- Accumulates distance using time deltas (`Date.now()`) and acceleration magnitude
- Arms scanning at `5m` (target distance)
- Triggers scan only after `STILLNESS_TIMEOUT` elapses while "still"
- Cancels stillness timer if movement resumes before the timeout

---

## `useSentenceBuilder.test.js`

### Purpose
Tests the custom hook `useSentenceBuilder` (imported from `../src/hooks/useSentenceBuilder`) which manages a "sentence" as an array of words and exposes actions to:

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
- Avoids confusing UX (no "speaking" popup when nothing exists to speak).

---

#### 7) `speakSentence` alerts joined sentence when not empty
**Test name**
- `speakSentence alerts joined sentence when not empty`

**What it verifies**
- Adding `"hello"`, `"there"` then calling `speakSentence()` triggers:
  - `Alert.alert('Speaking', 'hello there')`

**Why it matters**
- Confirms correct joining behavior and expected "speaking" output.

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

## `useSpeech.test.js`

### Purpose
Tests the `useSpeech` hook (imported from `../src/hooks/useSpeech`) which wraps the TTS (text-to-speech) service. The hook exposes two functions:

- `speakText(text)` — delegates to the `speak` function from `../services/tts`
- `stopSpeech()` — delegates to the `stop` function from `../services/tts`

### Key Testing Techniques Used

#### Mocking `../services/tts`
The test replaces the TTS service with mock functions:

- `speak` is mocked as a `jest.fn()` to intercept calls and verify arguments
- `stop` is mocked as a `jest.fn()` to intercept calls and verify invocation

Mock variables:
- `mockSpeak`: spy for `speak`
- `mockStop`: spy for `stop`

#### Hook Testing With `renderHook`
The tests use `@testing-library/react-native`:

- `renderHook(() => useSpeech())` to run the hook in a test environment

---

### Test Setup

#### `beforeEach`
- `jest.clearAllMocks()` resets call counts and recorded arguments before each test.

---

### Test Cases

#### 1) `speakText` calls `speak` with provided text
**Test name**
- `speakText calls speak with provided text`

**What it verifies**
- Calling `speakText('hello world')` results in:
  - `speak('hello world')` being called exactly once with the correct argument.

**Why it matters**
- Confirms `speakText` correctly passes through the text argument to the underlying TTS service without modification.

---

#### 2) `stopSpeech` calls `stop`
**Test name**
- `stopSpeech calls stop`

**What it verifies**
- Calling `stopSpeech()` results in:
  - `stop()` being called exactly once.

**Why it matters**
- Ensures the hook correctly delegates to the TTS service's `stop` function to halt ongoing speech.

---

#### 3) `speakText` with empty string still calls `speak`
**Test name**
- `speakText with empty string still calls speak`

**What it verifies**
- Calling `speakText('')` still calls `speak('')`.
- The hook does not guard against or swallow empty-string input.

**Why it matters**
- The filtering responsibility belongs to the caller; the hook should not silently drop calls.

---

#### 4) `speakText` does not call `stop`
**Test name**
- `speakText does not call stop`

**What it verifies**
- Calling `speakText` never inadvertently calls `stop`.

---

#### 5) `stopSpeech` does not call `speak`
**Test name**
- `stopSpeech does not call speak`

**What it verifies**
- Calling `stopSpeech` never inadvertently calls `speak`.

---

## `useSentence.test.js`

### Purpose
Tests the `useSentence` hook (imported from `../src/hooks/useSentence`) which manages a sentence as an array of words, provides immediate per-word speech feedback, and exposes actions to:

- Add a word (and immediately speak it)
- Speak the full sentence
- Clear the sentence (and stop any ongoing speech)

### Key Testing Techniques Used

#### Mocking `../services/tts`
The test replaces the TTS service with mock functions:

- `speak` is mocked as a `jest.fn()` to capture calls and verify arguments
- `stop` is mocked as a `jest.fn()` to capture calls and verify invocation

#### Hook Testing With `renderHook`
The tests use `@testing-library/react-native`:

- `renderHook(() => useSentence())` to run the hook in a test environment
- `act(() => ...)` to safely apply state updates before assertions

---

### Test Setup

#### `beforeEach`
- `jest.clearAllMocks()` resets all mock state between tests.

---

### Test Cases

#### 1) Initial sentence is empty
**Test name**
- `initial sentence is empty`

**What it verifies**
- On first render, `sentence` is `[]`.

---

#### 2) `addWord` appends the word to the sentence
**Test name**
- `addWord appends the word to the sentence`

**What it verifies**
- Calling `addWord('hello')` then `addWord('world')` results in:
  - `sentence` equal to `['hello', 'world']`

---

#### 3) `addWord` immediately speaks the word
**Test name**
- `addWord immediately speaks the word`

**What it verifies**
- Calling `addWord('hi')` triggers:
  - `speak('hi')` called exactly once with the correct argument.

**Why it matters**
- Immediate speech feedback is a core accessibility feature; the hook must call `speak` on every `addWord` invocation.

---

#### 4) `addWord` speaks each word independently as they are added
**Test name**
- `addWord speaks each word independently as they are added`

**What it verifies**
- Adding `'I'`, `'want'`, `'juice'` triggers `speak` three times with each individual word in order.

**Why it matters**
- Confirms per-word feedback rather than a single batched call.

---

#### 5) `speakSentence` speaks the full joined sentence
**Test name**
- `speakSentence speaks the full joined sentence`

**What it verifies**
- After adding `"I"`, `"want"`, `"food"`, calling `speakSentence()` triggers:
  - `speak('I want food')` called once.

**Why it matters**
- Confirms that words are joined with spaces and the full sentence is passed as a single string to the TTS service.

---

#### 6) `speakSentence` on empty sentence calls `speak` with empty string
**Test name**
- `speakSentence on empty sentence calls speak with empty string`

**What it verifies**
- Calling `speakSentence()` when `sentence` is `[]` triggers:
  - `speak('')` (since `[].join(' ')` is `''`).

**Why it matters**
- Documents and confirms the behaviour for edge case calls on an empty sentence; the hook does not guard against this.

---

#### 7) `clear` resets the sentence to empty
**Test name**
- `clear resets the sentence to empty`

**What it verifies**
- After adding `"test"`, calling `clear()` resets `sentence` to `[]`.

---

#### 8) `clear` calls `stop` to halt ongoing speech
**Test name**
- `clear calls stop to halt ongoing speech`

**What it verifies**
- Calling `clear()` triggers `stop()` exactly once.

**Why it matters**
- Clearing a sentence while speech is in progress should immediately halt audio output to avoid confusion.

---

#### 9) `clear` does not call `speak`
**Test name**
- `clear does not call speak`

**What it verifies**
- Calling `clear()` never produces new speech output.

---

## `usePictogram.test.js`

### Purpose
Tests the `usePictogram` hook (imported from `../src/hooks/usePictogram`) which resolves a word or phrase label to an ARASAAC pictogram image URI. The hook:

- Accepts an optional `arasaacId` override for direct resolution without a network call
- Uses an in-memory cache to avoid redundant fetches
- Applies search aliases to improve ARASAAC API query results
- Falls back to the last word of the label if the primary search returns no results
- Returns `{ uri, loading, error }`

Also tests the exported helper `getPictogramUrl(id)`.

### Key Testing Techniques Used

#### Mocking `fetch`
The global `fetch` is replaced with a `jest.fn()` to:

- Return controlled JSON responses simulating ARASAAC API results
- Simulate network errors or empty result sets

#### Hook Testing With `renderHook` and `waitFor`
The tests use `@testing-library/react-native`:

- `renderHook(() => usePictogram(...))` to run the hook
- `waitFor()` to wait for async `useEffect` state updates to settle before assertions

#### Cache Isolation
Because `usePictogram` uses a module-level in-memory cache, tests that check network calls use unique label strings to avoid hitting cached results from previous tests.

---

### Test Setup

#### `beforeEach`
- `jest.clearAllMocks()` resets fetch spy call records.

---

### Test Cases

#### 1) `getPictogramUrl` builds the correct URL
**Test name**
- `getPictogramUrl builds the correct ARASAAC image URL`

**What it verifies**
- `getPictogramUrl(12345)` returns:
  - `'https://static.arasaac.org/pictograms/12345/12345_500.png'`

---

#### 2) Returns URI immediately when `arasaacId` is provided (no fetch)
**Test name**
- `returns URI immediately when arasaacId is provided (no fetch)`

**What it verifies**
- With `usePictogram('anything', 9999)`:
  - `loading` is `false` from the initial render
  - `uri` equals `getPictogramUrl(9999)`
  - `fetch` is never called

**Why it matters**
- The `arasaacId` override path must be instant and free of network calls.

---

#### 3) Starts in loading state for an uncached label
**Test name**
- `starts in loading state for an uncached label`

**What it verifies**
- Before the fetch resolves, `loading` is `true` and `uri` is `null`.

---

#### 4) Fetches and resolves URI for a known label
**Test name**
- `fetches and resolves URI for a known label`

**What it verifies**
- With a mocked fetch returning `[{ _id: 100, keywords: [{ keyword: 'apple' }] }]`:
  - After resolution: `loading: false`, `uri` equals `getPictogramUrl(100)`, `error` is null

---

#### 5) Uses SEARCH_ALIASES to transform the label before searching
**Test name**
- `uses SEARCH_ALIASES to transform the label before searching`

**What it verifies**
- `usePictogram('eat')` causes `fetch` to be called with a URL containing `'eating'` (the alias), not `'eat'`.

---

#### 6) Falls back to last word if primary search fails
**Test name**
- `falls back to the last word of the label if primary search fails`

**What it verifies**
- For a label like `'wash hands'`:
  - First fetch returns an empty array
  - Second fetch is made with `'hands'` (last word of label)
  - Final `uri` resolves from the fallback result

---

#### 7) Sets error state when all fetches fail
**Test name**
- `sets error state when all fetches fail`

**What it verifies**
- When both the primary and fallback fetches fail:
  - `loading: false`, `uri: null`, `error` is a non-null string

---

#### 8) Caches result and does not re-fetch for the same label
**Test name**
- `caches result and does not re-fetch for the same label`

**What it verifies**
- Rendering `usePictogram('banana')` twice calls `fetch` only once (second render hits the cache).

---

#### 9) Sets error when fetch returns a non-ok response
**Test name**
- `sets error when fetch returns a non-ok response`

**What it verifies**
- An HTTP error status results in `uri: null` and a non-null `error` string.

---

## `useLocationDetection.test.js`

### Purpose
Tests the `useLocationDetection` hook (imported from `../src/hooks/useLocationDetection`) which provides an abstraction for room/location detection. Currently it supports manual room selection and is designed to be extended with Bluetooth beacon detection. The hook exposes:

- `currentRoom` — the currently active room object, or `null`
- `detectionMode` — the string `'manual'`
- `setRoomManually(roomId)` — selects a room by ID
- `allRooms` — the full list of available room definitions

### Key Testing Techniques Used

#### Mocking `../data/roomContexts`
The test replaces the data layer with controlled mock data:

- `getAllRooms` is mocked to return a predictable array of room objects
- `getRoomByBeaconId` is mocked as a `jest.fn()` for future BLE use cases

#### Hook Testing With `renderHook`
The tests use `@testing-library/react-native`:

- `renderHook(() => useLocationDetection())` to run the hook
- `act(() => ...)` to apply state changes before assertions

---

### Test Setup

#### `beforeEach`
- `jest.clearAllMocks()` resets mock call records.

---

### Test Cases

#### 1) Initial state has no current room
**Test name**
- `initial state has no current room`

**What it verifies**
- On first render, `currentRoom` is `null`.

---

#### 2) `detectionMode` is `'manual'`
**Test name**
- `detectionMode is "manual"`

**What it verifies**
- `detectionMode` is `'manual'` (BLE is not yet wired).

---

#### 3) `allRooms` returns all room definitions
**Test name**
- `allRooms returns all room definitions from the data layer`

**What it verifies**
- `allRooms` equals the array returned by the mocked `getAllRooms()`.

**Why it matters**
- Confirms the hook correctly exposes the full room list to consumers without modification.

---

#### 4) `setRoomManually` sets the current room by matching ID
**Test name**
- `setRoomManually sets the current room by matching ID`

**What it verifies**
- Calling `setRoomManually('kitchen')` updates `currentRoom` to `{ id: 'kitchen', label: 'Kitchen' }`.

---

#### 5) `setRoomManually` switches between rooms correctly
**Test name**
- `setRoomManually switches between rooms correctly`

**What it verifies**
- Moving from `'kitchen'` to `'bedroom'` updates `currentRoom` each time.

---

#### 6) `setRoomManually` with unknown ID sets current room to null
**Test name**
- `setRoomManually with an unknown ID sets currentRoom to null`

**What it verifies**
- Calling `setRoomManually('nonexistent_room')` results in `currentRoom` being `null`.

**Why it matters**
- Prevents a stale or incorrect room from being displayed when an unrecognised ID is provided.

---

#### 7) `setRoomManually` with null clears the current room
**Test name**
- `setRoomManually with null clears the current room`

**What it verifies**
- After setting a room, calling `setRoomManually(null)` resets `currentRoom` to `null`.

---

#### 8) `setRoomManually` does not throw for any input
**Test name**
- `setRoomManually does not throw for any input`

**What it verifies**
- Passing `undefined`, `''`, or `null` to `setRoomManually` never throws.

**Why it matters**
- Defensive robustness against unexpected argument types from the BLE layer.

---

## `useInteractionLogger.test.js`

### Purpose
Tests the `useInteractionLogger` hook (imported from `../src/hooks/useInteractionLogger`) which records user interaction events with structured metadata. The hook:

- Generates a device ID on mount derived from `Platform.OS` and `Platform.Version`
- Appends log entries to `interactionLogs` state on each `logButtonPress` call
- Associates each entry with a room location (from `currentRoom`) or falls back to `'general'`
- Emits each entry to `console.log`

### Key Testing Techniques Used

#### Mocking `react-native`
The test mocks `Platform` to control the device ID format:

- `Platform.OS` set to `'ios'`
- `Platform.Version` set to `'16'`

#### Mocking `console.log`
A spy on `console.log` captures emitted log entries for assertion.

#### Hook Testing With `renderHook`
The tests use `@testing-library/react-native`:

- `renderHook(() => useInteractionLogger(currentRoom))` with varying `currentRoom` values

---

### Test Setup

#### `beforeEach`
- `jest.clearAllMocks()` resets all spies.
- `logSpy` is set up on `console.log`.

#### `afterEach`
- `logSpy.mockRestore()` restores the original `console.log`.

---

### Test Cases

#### 1) `deviceId` is generated in the expected format
**Test name**
- `deviceId is generated in the expected format`

**What it verifies**
- `deviceId` matches the pattern `'ios-16-<random>'`.
- Starts with `'ios-16-'` and has at least one additional character.

---

#### 2) `interactionLogs` starts empty
**Test name**
- `interactionLogs starts empty`

**What it verifies**
- On first render, `interactionLogs` is `[]`.

---

#### 3) `logButtonPress` appends an entry with the correct structure
**Test name**
- `logButtonPress appends an entry with the correct structure`

**What it verifies**
- One entry is appended containing `deviceId`, `buttonName`, a valid ISO 8601 `pressedAt`, and `location: { id: 'general', label: 'General' }` (when `currentRoom` is null).

---

#### 4) `logButtonPress` uses room location when `currentRoom` is provided
**Test name**
- `logButtonPress uses room location when currentRoom is provided`

**What it verifies**
- With `currentRoom = { id: 'kitchen', label: 'Kitchen' }`, the entry's `location` equals `{ id: 'kitchen', label: 'Kitchen' }`.

---

#### 5) `logButtonPress` falls back to general when `currentRoom` is null
**Test name**
- `logButtonPress falls back to general location when currentRoom is null`

**What it verifies**
- With no room set, `location` equals `{ id: 'general', label: 'General' }`.

---

#### 6) `logButtonPress` merges additional metadata into the entry
**Test name**
- `logButtonPress merges additional metadata into the entry`

**What it verifies**
- Calling `logButtonPress('word_tile', { word: 'hello' })` produces an entry where `entry.word === 'hello'`.

---

#### 7) `logButtonPress` emits entry to `console.log`
**Test name**
- `logButtonPress emits entry to console.log`

**What it verifies**
- `console.log` is called with `'[InteractionLog]'` and a valid JSON string after each press.

---

#### 8) Multiple `logButtonPress` calls accumulate entries in order
**Test name**
- `multiple logButtonPress calls accumulate entries in order`

**What it verifies**
- Three calls result in `interactionLogs.length === 3` with entries in call order.

---

#### 9) `logButtonPress` with no metadata does not crash
**Test name**
- `logButtonPress with no metadata does not crash`

**What it verifies**
- Calling `logButtonPress` with only a button name (no metadata) does not throw.

---

## Summary

- `movementSensor.test.js` — sensor lifecycle and movement/stillness logic, mocked Expo Accelerometer, controlled timers.
- `useSentenceBuilder.test.js` — sentence state management, speech output via `Alert.alert`, optional event logging.
- `useSpeech.test.js` — thin TTS wrapper, correct delegation of `speakText` and `stopSpeech`.
- `useSentence.test.js` — sentence state with immediate per-word feedback, `clear`/`stop` integration.
- `usePictogram.test.js` — pictogram resolution: `arasaacId` override, caching, alias lookup, fallback search, error states.
- `useLocationDetection.test.js` — manual room selection, null handling, correct exposure of room data.
- `useInteractionLogger.test.js` — log entry structure, device ID, room location association, metadata merging, `console.log` output.
