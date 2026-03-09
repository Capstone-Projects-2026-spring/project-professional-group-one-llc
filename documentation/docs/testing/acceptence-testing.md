---
sidebar_position: 3
---
# Acceptance test

Demonstration of all of the functional and non-functional requirements. This can be a combination of automated tests derived from the use-cases (user stories) and manual tests with recorded observation of the results.

# Acceptance Test Documentation

Acceptance tests verify that the system meets its functional and non-functional requirements from the perspective of an end user. Each test is derived directly from a use-case. Automated tests are indicated where all assertions can be made programmatically; manual tests include an observation record table for sign-off.

---

## Use Case 1 — Account Creation

**User story:** As a user, I want to create an account so that I can store and access my personalized communication preferences.

**Test type:** Manual

**Preconditions:**
- The AAC Beacon web application is accessible.
- The user has not previously registered.

**Test steps:**
1. Navigate to the AAC Beacon application for the first time.
2. Verify a landing page is shown with "Register" and "Login" options.
3. Select "Register".
4. Enter a valid username, email address, and password.
5. Choose account type (admin or child).
6. Optionally enter accessibility preferences.
7. Select "Sign Up".
8. Verify a confirmation message is displayed.
9. Select "Sign In" and enter the new credentials.
10. Verify redirection to the home page.

**Acceptance criteria:**
- Registration form accepts valid inputs and displays a success confirmation.
- Account type selection (admin / child) is available and selectable.
- After sign-in with new credentials, the user lands on the home page.
- Attempting to register with an already-used email shows an appropriate error.

**Observation record:**

| Step | Expected result | Observed result | Pass/Fail |
|---|---|---|---|
| Landing page shown | Register and Login options visible | | |
| Register form loads | Form fields present for username, email, password, account type | | |
| Valid submission | Success confirmation displayed | | |
| Sign in with new credentials | Redirected to home page | | |
| Duplicate email registration | Error message displayed | | |

---

## Use Case 2 — Signing In

**User story:** As a user, I want to log into my account so that I can access my personalized communication vocabulary.

**Test type:** Manual + Automated (credential validation logic)

**Preconditions:**
- A registered account exists.

**Test steps:**
1. Navigate to the AAC Beacon application.
2. Select "Login".
3. Enter valid email and password.
4. Verify redirection to the home page.
5. Repeat with invalid credentials and verify an error notification is shown.

**Acceptance criteria:**
- Valid credentials redirect the user to the home page.
- Invalid credentials display an error notification and prompt the user to try again.
- The login page is accessible from the landing page.

**Automated assertions (credential validation):**
- Submitting with empty fields does not proceed and shows validation messages.
- Submitting with a valid email format and non-empty password attempts authentication.

**Observation record:**

| Step | Expected result | Observed result | Pass/Fail |
|---|---|---|---|
| Login page accessible | Login form visible | | |
| Valid credentials | Redirected to home page | | |
| Invalid credentials | Error notification shown, user prompted to retry | | |
| Empty field submission | Validation error shown, no request sent | | |

---

## Use Case 3 — Connecting to a Beacon

**User story:** As a child user, I want to connect to a beacon in a room so that I can quickly access vocabulary tailored to that location.

**Test type:** Automated (manual selection path) + Manual (physical BLE)

**Preconditions:**
- At least one room is defined in the data layer.
- For the manual test: a physical beacon device is active in the room.

**Automated test steps:**
1. Render `useLocationDetection`.
2. Call `setRoomManually('kitchen')`.
3. Assert `currentRoom` and `allRooms`.

**Automated assertions:**
- Before selection: `currentRoom` is `null`.
- After `setRoomManually('kitchen')`: `currentRoom` equals `{ id: 'kitchen', label: 'Kitchen' }`.
- `allRooms` contains all rooms from the data layer.
- `detectionMode` is `'manual'`.

**Manual observation (physical BLE beacon):**

| Action | Expected result | Observed result | Pass/Fail |
|---|---|---|---|
| Enter room with active beacon | App detects beacon automatically | | |
| Beacon detected | Room-specific vocabulary loads and displays | | |
| Leave room | `currentRoom` clears or switches | | |
| Re-enter room | Vocabulary reloads for that room | | |

---

## Use Case 4 — Using Vocabulary for Communication

**User story:** As a user, I want to quickly select words from my personalized vocabulary so that I can communicate efficiently.

**Test type:** Automated

**Preconditions:**
- A room vocabulary is loaded (or default vocabulary is available).

**Automated test steps:**
1. Render `useSentenceBuilder` with `onLogPress` wired to `useInteractionLogger`.
2. Call `addWord` for `'I'`, `'want'`, `'juice'`.
3. Call `speakSentence`.
4. Call `removeLastWord`.
5. Call `clearSentence`.

**Automated assertions:**
- After adding three words: `sentence` equals `['I', 'want', 'juice']`.
- `speak` is called with `'I'`, `'want'`, `'juice'` individually (immediate feedback).
- `speakSentence` calls `speak('I want juice')` and `Alert.alert('Speaking', 'I want juice')`.
- `removeLastWord` reduces `sentence` to `['I', 'want']`.
- `clearSentence` resets `sentence` to `[]` and calls `stop()`.
- `interactionLogs` records every action with correct event names and payloads.
- All operations work identically when no room is selected (`currentRoom` is `null`).

---

## Use Case 5 — Updating Favorite Words

**User story:** As an admin user, I want to update my frequently used words so that the system reflects my communication needs.

**Test type:** Manual

**Preconditions:**
- The user is signed in with an admin account.
- At least one vocabulary set exists linked to a room or general usage.

**Test steps:**
1. Navigate to the vocabulary preferences page.
2. Select a vocabulary set linked to a specific room (e.g., Kitchen).
3. Add a new word to the set.
4. Remove an existing unused word from the set.
5. Save the updates.
6. Verify the system confirms synchronisation with associated beacons.
7. Connect to the corresponding beacon room and verify the updated vocabulary is displayed.

**Acceptance criteria:**
- Admin users can add and remove words from any vocabulary set.
- Saving updates triggers synchronisation confirmation.
- The updated vocabulary appears on the device after connecting to the associated room's beacon.
- Child accounts do not have access to the vocabulary management page.

**Observation record:**

| Step | Expected result | Observed result | Pass/Fail |
|---|---|---|---|
| Vocabulary page accessible (admin) | Page loads with vocabulary sets | | |
| Room-specific set selected | Words for that room displayed | | |
| Word added and saved | New word appears in vocabulary set | | |
| Word removed and saved | Removed word no longer appears | | |
| Sync confirmation shown | Message or indicator confirms sync | | |
| Room beacon reconnected | Updated vocabulary visible on device | | |
| Child account attempts access | Access denied or option not visible | | |

---

## Use Case 6 — Beacon Connection Failure Handling

**User story:** As a user, I want to be notified if a beacon connection fails so that I can still access my communication tools.

**Test type:** Automated (fallback behaviour) + Manual (notification to admin)

**Preconditions:**
- The system attempts beacon detection on room entry.

**Automated test steps:**
1. Render `useLocationDetection` without calling `setRoomManually`.
2. Render `useSentenceBuilder` and `useInteractionLogger` with `currentRoom` as `null`.
3. Perform a full communication sequence (add words, speak, clear).

**Automated assertions:**
- `currentRoom` remains `null` (connection never succeeded).
- All sentence operations (`addWord`, `speakSentence`, `removeLastWord`, `clearSentence`) complete without error.
- All `interactionLogs` entries have `location: { id: 'general', label: 'General' }`.
- `speak` is called correctly for individual words and the full sentence.
- No exceptions are thrown throughout the session.

**Manual observation (failure notification):**

| Action | Expected result | Observed result | Pass/Fail |
|---|---|---|---|
| Enter room, beacon unreachable | Admin receives connection failure notification | | |
| Connection failure occurs | Default / last-used vocabulary loads automatically | | |
| Child user attempts communication | Communication tools fully available despite failure | | |
| Beacon becomes available again | App reconnects and loads room vocabulary | | |

---

## Non-Functional Requirements

---

### NFR1 — Word tile selection responds without perceptible delay

**Requirement:** Speech feedback must begin within 200 ms of a tile tap.

**Test type:** Manual

**Procedure:**
1. Launch the app on a physical or emulated device.
2. Tap a word tile and observe the spoken response time.
3. Repeat 10 times with different tiles.

**Acceptance criterion:** Speech begins within 200 ms on all 10 attempts.

**Observation record:**

| Attempt | Tile | Response time (ms) | Pass/Fail |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
| 9 | | | |
| 10 | | | |

---

### NFR2 — Pictogram images load within 3 seconds on a standard connection

**Requirement:** All pictograms on a screen must be visible within 3 seconds of the screen mounting.

**Test type:** Manual

**Procedure:**
1. Clear the in-memory pictogram cache (restart app).
2. Navigate to a screen with 6 word tiles.
3. Measure time from screen mount to all images being visible.

**Acceptance criterion:** All pictograms displayed within 3 seconds.

**Observation record:**

| Screen | Tiles | Time to fully loaded (s) | Pass/Fail |
|---|---|---|---|
| Default vocabulary | 6 | | |
| Kitchen context | 6 | | |
| Bedroom context | 6 | | |

---

### NFR3 — Communication remains uninterrupted during a beacon failure

**Requirement:** A beacon connection failure must not block or delay communication for the child user.

**Test type:** Automated

**Automated assertions:**
- With `currentRoom` null, all of `addWord`, `speakSentence`, `removeLastWord`, and `clearSentence` complete without error or delay.
- `interactionLogs` are recorded correctly using the `'general'` location fallback.

---

### NFR4 — The system handles edge-case inputs without crashing

**Requirement:** No user action or unexpected input should cause the app to crash or enter an invalid state.

**Test type:** Automated

**Automated assertions:**
- `removeLastWord` on an empty sentence → `sentence` stays `[]`, no exception.
- `speakSentence` on an empty sentence → `speak` not called, `Alert.alert` not called, no exception.
- `setRoomManually` with an unknown ID → `currentRoom` is `null`, no exception.
- `clearSentence` when already empty → `sentence` is `[]`, `stop` called, no exception.
- `logButtonPress` with no metadata argument → entry recorded without error.

---

### NFR5 — Sensor resources are released when navigation leaves the movement sensor screen

**Requirement:** The Accelerometer subscription must be removed when `stop()` is called to prevent memory leaks and duplicate listeners.

**Test type:** Automated

**Automated assertions:**
- `subscription.remove()` is called exactly once when `stop()` is invoked.
- No further listener callbacks fire after `stop()` is called.
