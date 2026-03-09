---
sidebar_position: 2
---
# Integration tests

Tests to demonstrate each use-case based on the use-case descriptions and the sequence diagrams. External input should be provided via mock objects and results verified via mock objects. Integration tests should not require manual entry of data nor require manual interpretation of results.

# Integration Test Documentation

Integration tests verify that the hooks and modules work correctly together as a system. Each test maps directly to a use-case. Only external dependencies (device sensors, network APIs, native TTS, platform APIs) are replaced with mock objects. All assertions are automated.

---

## Use Case 3 — Connecting to a Beacon

**Scenario:** The application detects a nearby beacon and loads the vocabulary associated with that room.

**Modules involved:** `useLocationDetection`, `useInteractionLogger`

**Sequence:**
1. The app renders with no room selected (`currentRoom` is `null`).
2. The beacon is detected and `setRoomManually` is called with the beacon's room ID (simulating the BLE detection path currently implemented as manual selection).
3. `currentRoom` updates to the matching room object.
4. `useInteractionLogger` is re-initialised with the new `currentRoom`.
5. Any subsequent log entries reflect the connected room.

**Mocks:**
- `../data/roomContexts` → `getAllRooms` returns `[{ id: 'kitchen', label: 'Kitchen' }, { id: 'bedroom', label: 'Bedroom' }]`; `getRoomByBeaconId` is a `jest.fn()`.

**Automated assertions:**
- Before connection: `currentRoom` is `null` and `detectionMode` is `'manual'`.
- After `setRoomManually('kitchen')`: `currentRoom` equals `{ id: 'kitchen', label: 'Kitchen' }`.
- `allRooms` always equals the full mocked room array.
- Log entries recorded after connection have `location.id === 'kitchen'`.
- Log entries recorded before connection have `location: { id: 'general', label: 'General' }`.

---

## Use Case 4 — Using Vocabulary for Communication

**Scenario:** A user selects words from the room vocabulary to build and speak a sentence.

**Modules involved:** `useSentenceBuilder`, `useSpeech`, `useInteractionLogger`

**Sequence:**
1. `useInteractionLogger` is rendered with an active `currentRoom`; `logButtonPress` is passed to `useSentenceBuilder` as `onLogPress`.
2. The user taps word tiles one by one; `addWord` is called for each.
3. Each word is spoken immediately via the TTS service.
4. Each word tap is logged with event name `'word_tile'` and the word as payload.
5. The user taps "Speak"; `speakSentence` is called.
6. The full joined sentence is passed to the TTS service.
7. A visual confirmation alert is shown.
8. The speak event is logged with event name `'speak_sentence'` and the sentence length.

**Mocks:**
- `../services/tts` → `speak` and `stop` are `jest.fn()`.
- `react-native` → `Alert.alert` is spied upon.

**Automated assertions:**
- `speak` is called once per `addWord`, each time with the correct individual word.
- `sentence` state reflects all added words in order.
- After `speakSentence`: `speak` is called with the full space-joined sentence string.
- `Alert.alert` is called with `('Speaking', <joined sentence>)`.
- `onLogPress` is called with `('word_tile', { word: <w> })` for every word added.
- `onLogPress` is called with `('speak_sentence', { sentenceLength: <n> })` on speak.
- `interactionLogs` contains one entry per user action in call order.

---

## Use Case 4 (extended) — Removing and Clearing Words During Communication

**Scenario:** A user corrects a mistake by removing the last word, then later clears the whole sentence.

**Modules involved:** `useSentenceBuilder`, `useSpeech`, `useInteractionLogger`

**Sequence:**
1. The user builds a partial sentence via several `addWord` calls.
2. The user taps "Backspace"; `removeLastWord` is called.
3. Only the last word is removed; the rest of the sentence is preserved.
4. The event is logged with `'remove_last_word'`.
5. The user taps "Clear"; `clearSentence` is called.
6. The sentence is reset to `[]` and TTS is stopped.
7. The event is logged with `'clear_sentence'`.

**Mocks:**
- `../services/tts` → `speak` and `stop` are `jest.fn()`.

**Automated assertions:**
- After `removeLastWord`: `sentence` has one fewer element and all prior words remain.
- `removeLastWord` on an empty sentence does not throw and `sentence` remains `[]`.
- After `clearSentence`: `sentence` is `[]`.
- `stop` is called exactly once on `clearSentence`.
- `onLogPress` is called with `'remove_last_word'` (no payload) on each backspace.
- `onLogPress` is called with `'clear_sentence'` (no payload) on clear.

---

## Use Case 3 + 4 (combined) — Beacon Connection Followed by Word Selection

**Scenario:** Room detection and sentence building work together so that log entries are correctly associated with the detected room.

**Modules involved:** `useLocationDetection`, `useInteractionLogger`, `useSentenceBuilder`

**Sequence:**
1. App starts; `currentRoom` is `null`.
2. Beacon detected → `setRoomManually('living_room')` called.
3. `useInteractionLogger` receives the new `currentRoom`.
4. User taps three word tiles.
5. User taps "Speak".

**Mocks:**
- `../data/roomContexts` → `getAllRooms` returns `[{ id: 'living_room', label: 'Living Room' }]`.
- `../services/tts` → `speak` and `stop` are `jest.fn()`.
- `react-native` → `Alert.alert` is spied upon.

**Automated assertions:**
- All log entries (word tiles + speak) have `location: { id: 'living_room', label: 'Living Room' }`.
- `currentRoom.label` is `'Living Room'` throughout the word selection phase.
- `speak` is called for each individual word and once for the full sentence.
- `interactionLogs.length` equals 4 (3 words + 1 speak).

---

## Use Case 6 — Beacon Connection Failure: Fallback Vocabulary

**Scenario:** The beacon cannot be detected; the app falls back to a default (no-room) vocabulary and continues to function normally without interruption.

**Modules involved:** `useLocationDetection`, `useInteractionLogger`, `useSentenceBuilder`

**Sequence:**
1. Beacon detection is attempted but fails; `setRoomManually` is never called.
2. `currentRoom` remains `null`.
3. The app loads the default vocabulary (not room-specific).
4. The user selects words and speaks a sentence as normal.
5. All log entries fall back to `location: { id: 'general', label: 'General' }`.

**Mocks:**
- `../data/roomContexts` → `getAllRooms` returns the full room list (beacon detection path never invoked).
- `../services/tts` → `speak` and `stop` are `jest.fn()`.
- `react-native` → `Alert.alert` is spied upon.

**Automated assertions:**
- `currentRoom` is `null` throughout the session.
- `addWord`, `removeLastWord`, `clearSentence`, and `speakSentence` all operate correctly with no room set.
- All `interactionLogs` entries have `location: { id: 'general', label: 'General' }`.
- No exceptions are thrown at any point.

---

## Use Case 3 (BLE trigger) — Movement Sensor Arms Before Beacon Scan

**Scenario:** The movement sensor detects the user has walked far enough to warrant a new BLE beacon scan, which would then trigger room detection (Use Case 3).

**Modules involved:** `movementSensor`, `useLocationDetection`

**Sequence:**
1. `movementSensor` is imported; it registers an Accelerometer listener.
2. The user walks; high-magnitude accelerometer samples are fed to the listener.
3. Once 5 m of estimated travel is accumulated, scanning is armed.
4. The device becomes still; the 800 ms stillness timer starts.
5. After the timer elapses, a BLE scan fires (logged as `[BLE] Scanning for nearby devices...`).
6. The scan result would be passed to `getRoomByBeaconId` then `setRoomManually` (simulated as a direct call).
7. `currentRoom` updates to the room associated with the discovered beacon.

**Mocks:**
- `expo-sensors` → `Accelerometer.addListener` captures the listener; `Accelerometer.setUpdateInterval` is a `jest.fn()`.
- `jest.useFakeTimers()` and `Date.now` mock for deterministic timing.
- `console.log` spied upon to capture scan and arming messages.
- `../data/roomContexts` → `getAllRooms` returns a controlled room list.

**Automated assertions:**
- Arming log appears after sufficient movement: `'[Tracker] 5m reached — will scan when device stops.'`
- Scan log appears after stillness timeout: `'[BLE] Scanning for nearby devices...'`
- No scan occurs if movement resumes before the timeout expires.
- No scan occurs if the device was never armed (distance threshold not reached).
- After simulated scan result: `setRoomManually` resolves `currentRoom` correctly.
