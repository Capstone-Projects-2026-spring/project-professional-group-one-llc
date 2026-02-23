---
sidebar_position: 1
---

# Design Document – Part I: Architecture

## 1. Introduction

This document describes the software architecture for **AAC Beacon**, a location-aware Augmentative and Alternative Communication (AAC) mobile application built with React Native. It maps the system requirements to the architectural design, explains component relationships, presents class and sequence diagrams, and describes the database schema and core algorithms.

AAC Beacon reduces communication friction for users who rely on AAC by automatically surfacing the vocabulary most relevant to their current physical environment. Bluetooth Low Energy (BLE) beacons act as room identifiers; when a user's device detects a beacon, the application instantly loads a personalized, location-specific word set rather than requiring the user to navigate multiple menus.

---

## 2. System Overview

### 2.1 Architecture Style

AAC Beacon follows a **client-server architecture** with a React Native mobile application on the front end and Supabase (PostgreSQL + Auth + Storage) as the back-end platform. The system has three primary layers:

- **Bluetooth Beacon Layer** – physical BLE beacons deployed in rooms that broadcast unique identifiers.
- **Client Layer** – a React Native app running on the user's iOS or Android device that scans for beacons and renders the AAC interface natively.
- **Backend Layer** – Supabase services that store user profiles, location metadata, AAC vocabulary, and usage logs.

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile App | React Native (Expo) | Cross-platform iOS/Android native UI |
| BLE Scanning | `react-native-ble-plx` | Detect nearby beacons and RSSI values |
| Text-to-Speech | `expo-speech` | Convert constructed sentences to audio |
| Local Storage | `expo-secure-store` / AsyncStorage | Session persistence and offline cache |
| Backend | Supabase | PostgreSQL DB, Auth (JWT/RLS), Storage, Realtime |
| Deployment | Expo EAS Build | Native binary builds for iOS and Android |

---

## 3. Component Descriptions and Interfaces

### 3.1 Bluetooth Beacon Layer

Physical BLE beacons (iBeacon or Eddystone format) are deployed throughout the facility by an administrator. Each beacon broadcasts:

- **UUID** – a globally unique identifier registered in the Supabase database.
- **RSSI (Received Signal Strength Indicator)** – used by the client to determine proximity.

Beacons are passive transmitters; they do not receive or process data. An administrator pairs a beacon to a named location through the Admin screen and the pairing is stored in the database.

### 3.2 React Native Mobile Application

The React Native app is organized into six functional modules:

| Module | Responsibility |
|---|---|
| BLE Scanning Module | Continuously scans for nearby beacons via `react-native-ble-plx`. Returns a list of `(UUID, RSSI)` pairs. |
| Context Interpreter | Selects the beacon with the highest RSSI (with weighted proximity blending for neighbouring locations) to determine the current room. |
| Local Cache | Maintains AsyncStorage-backed copies of recently fetched vocabulary boards for offline fallback. |
| AAC Interface | Renders the native icon grid, handles word selection, and passes chosen words to the Sentence Builder. |
| Sentence Builder | Maintains the current phrase, exposes add/delete/clear operations, and passes the final string to Speech Output. |
| Speech Output Trigger | Calls `expo-speech` (`Speech.speak()`) to vocalise the constructed phrase through the device speaker. |

The app requires the following native permissions:

- `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` (Android 12+) or `NSBluetoothAlwaysUsageDescription` (iOS) – for BLE beacon scanning.
- `android.permission.ACCESS_FINE_LOCATION` (Android) – required by the OS for BLE scanning.

### 3.3 Supabase Backend

Supabase provides four services used by AAC Beacon:

- **PostgreSQL Database** – stores all persistent application data (see Section 6 for schema).
- **Auth (JWT + RLS)** – manages administrator sessions via `@supabase/supabase-js`; row-level security policies enforce access rules.
- **Realtime** – allows vocabulary changes made in the Admin screen to be pushed immediately to connected devices.
- **Storage Bucket** – holds icon images and symbol assets uploaded by administrators.

### 3.4 Admin Screen

A protected stack of React Native screens (accessible only after administrator login) that provides:

- Management of administrator and child user accounts.
- Pairing of BLE beacons to named locations.
- Assignment and weighting of vocabulary words per location.
- View of usage analytics and logs.

### 3.5 External Services

- **expo-speech (TTS)** – device-native, no external API key required. Falls back to platform TTS engine (iOS AVSpeechSynthesizer / Android TextToSpeech).
- **Email Provider (Supabase SMTP)** – sends verification and password-reset emails to administrators.

---

## 4. Class Diagrams

### 4.1 User & Account Management

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│      MainAdministrator      │        │        Administrator         │
├─────────────────────────────┤        ├─────────────────────────────┤
│ - orgName: string           │        │ - adminId: uuid             │
│ - email: string             │ extends│ - email: string             │
│ - passwordHash: string      │◄───────│ - isVerified: boolean       │
├─────────────────────────────┤        ├─────────────────────────────┤
│ + register()                │        │ + login()                   │
│ + createAdmin()             │        │ + createUser()              │
│ + verifyAdmin()             │        │ + manageBeacon()            │
│ + login()                   │        │ + manageVocab()             │
└─────────────────────────────┘        └──────────────┬──────────────┘
                                                       │ 1..*
                                                       ▼
                                       ┌─────────────────────────────┐
                                       │         UserAccount          │
                                       ├─────────────────────────────┤
                                       │ - userId: uuid              │
                                       │ - displayName: string       │
                                       │ - adminOwner: uuid          │
                                       │ - accessibilityPrefs: object│
                                       ├─────────────────────────────┤
                                       │ + loadWordSet(locationId)   │
                                       │ + logWordUsage(word)        │
                                       │ + getContext()              │
                                       └─────────────────────────────┘
```

**Relationships:** `MainAdministrator` extends `Administrator` (inherits all admin capabilities and adds org-level controls). `Administrator` has a one-to-many relationship with `UserAccount`. All admin accounts must be verified by the `MainAdministrator` before becoming active.

---

### 4.2 Beacon & Location Domain

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│           Beacon            │  N:1   │          Location            │
├─────────────────────────────┤───────►├─────────────────────────────┤
│ - beaconId: uuid            │        │ - locationId: uuid          │
│ - bleUuid: string           │        │ - name: string              │
│ - title: string             │        │ - adminId: uuid             │
│ - locationId: uuid          │        │ - description: string       │
├─────────────────────────────┤        ├─────────────────────────────┤
│ + getSignalStrength()       │        │ + getVocabulary(userId)     │
│ + getLocation()             │        │ + listNearbyLocations()     │
└─────────────────────────────┘        └─────────────────────────────┘

┌──────────────────────────────────────┐
│            BeaconScanner             │
├──────────────────────────────────────┤
│ - detectedBeacons: Map<uuid, number> │
│ - currentLocation: Location          │
│ - stableCount: number                │
├──────────────────────────────────────┤
│ + startScan()                        │
│ + stopScan()                         │
│ + resolveLocation()                  │
│ + onBeaconDetected(callback)         │
└──────────────────────────────────────┘
```

**Relationships:** Each `Beacon` is associated with exactly one `Location`. `BeaconScanner` observes multiple `Beacon` signals and resolves the strongest to a `Location`. `Location` has a many-to-many relationship with `VocabularyWord` through `LocationWord`.

---

### 4.3 Vocabulary Domain

```
┌───────────────────────┐     ┌───────────────────────┐
│    VocabularyWord     │ M:N │     LocationWord       │
├───────────────────────┤◄────┤ (junction)             │
│ - wordId: uuid        │     ├───────────────────────┤
│ - text: string        │     │ - locationId: uuid    │
│ - iconUrl: string     │     │ - wordId: uuid        │
│ - category: string    │     │ - weight: float       │
├───────────────────────┤     ├───────────────────────┤
│ + render()            │     │ + getWeight()         │
│ + getIcon()           │     │ + setWeight(w)        │
└───────────────────────┘     └───────────────────────┘

┌───────────────────────┐     ┌───────────────────────┐
│     UserContext       │     │    SentenceBuilder    │
├───────────────────────┤     ├───────────────────────┤
│ - userId: uuid        │     │ - tokens: string[]    │
│ - locationId: uuid    │     ├───────────────────────┤
│ - usageHistory: Map   │     │ + addWord(word)       │
├───────────────────────┤     │ + removeWord(index)   │
│ + getSuggestions()    │     │ + clear()             │
│ + recordUsage(word)   │     │ + speak()             │
└───────────────────────┘     │ + toString()          │
                              └───────────────────────┘
```

**Relationships:** `VocabularyWord` is linked to `Location` via the junction class `LocationWord`, which carries an admin-assigned weight influencing suggestion ranking. `UserContext` tracks per-user word-usage frequency per location and feeds the suggestion algorithm. `SentenceBuilder` holds the transient phrase being constructed and triggers Speech Output via `expo-speech`.

---

## 5. Sequence Diagrams

### Use Case 1 – Account Creation

```
Guest App       React Native App      Supabase Auth       Email Provider
    │                  │                    │                    │
    │── Open App ──────►                    │                    │
    │◄── Registration Screen ──────────────-│                    │
    │── Submit {username,email,password} ──►│                    │
    │                  │── auth.signUp() ──►│                    │
    │                  │                   │── INSERT admins ──► DB
    │                  │                   │── sendEmail() ─────►│
    │                  │◄── session ───────│                    │
    │◄── Success / redirect to Login ───────│                    │
```

**Steps:**
1. User opens the app and is directed to the registration screen.
2. User submits `{ username, email, password, role }`.
3. React Native app calls `supabase.auth.signUp()`.
4. Supabase Auth creates an `auth.users` record and inserts an `administrators` row.
5. Verification email is dispatched to the user's address.
6. App displays a success message and navigates to the Login screen.

---

### Use Case 2 – Signing In

```
User App        React Native App      Supabase Auth       PostgreSQL
    │                  │                    │                  │
    │── Enter email/password ─────────────►│                  │
    │                  │── auth.signInWithPassword() ────────►│
    │                  │◄── JWT session ────│                  │
    │                  │── SELECT role, profile ─────────────►│
    │                  │◄── profile row ────────────────────── │
    │◄── Home Screen (role-appropriate) ────│                  │
```

**Steps:**
1. User enters email and password on the Login screen.
2. App calls `supabase.auth.signInWithPassword()`.
3. On success, Supabase returns a JWT session stored via `expo-secure-store`.
4. App fetches the user's role and profile from PostgreSQL.
5. User is navigated to the Home screen appropriate for their role.
6. On failure, an error toast is displayed and the user is prompted to retry.

---

### Use Case 3 – Connecting to a Beacon

```
BLE Beacons     BLE Scanner     Context Interpreter    Supabase API    AAC UI
    │                │                  │                   │              │
    │── broadcast ──►│                  │                   │              │
    │                │── onDetected() ─►│                   │              │
    │                │                  │── resolveLocation()              │
    │                │                  │── fetchVocabulary(locId,userId)─►│
    │                │                  │◄── {words, weights, icons} ──────│
    │                │                  │── cache payload                  │
    │                │                  │─────────────── renderGrid() ────►│
```

**Steps:**
1. BLE Scanner collects `(UUID, RSSI)` pairs from nearby beacons using `react-native-ble-plx`.
2. `onBeaconDetected()` callback updates the `Context Interpreter`.
3. `resolveLocation()` selects the highest-RSSI beacon and maps it to a `locationId`.
4. App fetches the personalized vocabulary from Supabase using `locationId` and `userId`.
5. The payload is written to the local AsyncStorage cache for offline fallback.
6. AAC UI renders the location-specific icon grid.

---

### Use Case 4 – Using Vocabulary for Communication

```
Child User      AAC UI         Sentence Builder     expo-speech      Supabase
    │              │                  │                   │              │
    │── tap icon ─►│                  │                   │              │
    │              │── addWord() ────►│                   │              │
    │              │◄── updated phrase│                   │              │
    │── tap Speak ─►                  │                   │              │
    │              │── speak() ──────►│                   │              │
    │              │                  │── Speech.speak() ►│              │
    │              │                  │                   │── audio out  │
    │              │── INSERT usage_log ─────────────────────────────── ►│
```

**Steps:**
1. User taps an icon on the AAC grid.
2. `addWord()` appends the word to the Sentence Builder's token array; the phrase strip updates.
3. User repeats taps to build a sentence.
4. User taps the **Speak** button.
5. `expo-speech` vocalises the phrase through the device speaker.
6. A `usage_log` row is inserted asynchronously to Supabase for future suggestion ranking.

---

### Use Case 5 – Updating Favorite Words (Admin)

```
Admin User      Admin Screen     Supabase API     Realtime     Client Devices
    │                │                 │              │               │
    │── navigate to Vocab Prefs ──────►│              │               │
    │                │── fetchWords(locationId) ─────►│              │
    │                │◄── current word list ──────────│              │
    │── add/remove/reweight words ────►│              │               │
    │── tap Save ────►                 │              │               │
    │                │── UPSERT location_words ───────►              │
    │                │◄── success ─────────────────── │              │
    │                │                 │── broadcast change event ───►│
    │                │                 │              │── re-fetch ──►│
```

**Steps:**
1. Admin navigates to the Vocabulary Preferences screen for a selected location.
2. Current word list is fetched from Supabase.
3. Admin adds, removes, or adjusts the weight of words in the UI.
4. Admin taps **Save**; the app sends an UPSERT to the `location_words` table.
5. Supabase Realtime broadcasts the change to all connected client devices.
6. Clients silently re-fetch the updated vocabulary.

---

### Use Case 6 – Beacon Connection Failure Handling

```
Child Device    BLE Scanner     Context Interpreter    AsyncStorage    Admin
    │                │                  │                   │            │
    │                │── startScan() ───►                   │            │
    │                │── timeout (no signal) ──────────────►│            │
    │                │                  │── loadFallback() ►│            │
    │                │                  │◄── cached vocab ──│            │
    │◄── renderGrid(fallbackWords) ─────│                   │            │
    │◄── "Offline Mode" banner ─────────│                   │            │
    │                │                  │── notifyAdmin() ──────────────►│
```

**Steps:**
1. BLE Scanner calls `startScan()` but times out with no beacon signal detected.
2. `Context Interpreter` raises a `BeaconNotFoundError`.
3. The app loads the last successfully fetched vocabulary from AsyncStorage.
4. The AAC grid is rendered with the fallback vocabulary; a non-intrusive "Offline Mode" banner is shown.
5. An alert is dispatched to the linked administrator via Supabase Edge Function.
6. The child user continues communication without interruption.

---

## 6. Database Design

### 6.1 Entity-Relationship Overview

The database comprises six core entities:

- `organizations` **(1)** — administers — **(N)** `administrators`
- `administrators` **(1)** — manages — **(N)** `user_accounts`
- `administrators` **(1)** — registers — **(N)** `beacons`
- `beacons` **(N)** — associated with — **(1)** `locations`
- `locations` **(M)** — linked to — **(N)** `vocabulary_words` via `location_words`
- `user_accounts` **(1)** — generates — **(N)** `usage_logs`
- `usage_logs` — references — `vocabulary_words` and `locations`

### 6.2 Table Design

#### organizations

| Column | Type | Constraints | Description |
|---|---|---|---|
| `org_id` | uuid | PK, default `gen_random_uuid()` | Unique organization identifier |
| `name` | text | NOT NULL, UNIQUE | Organization or facility name |
| `created_at` | timestamptz | DEFAULT `now()` | Record creation timestamp |

#### administrators

| Column | Type | Constraints | Description |
|---|---|---|---|
| `admin_id` | uuid | PK, FK → `auth.users.id` | Linked to Supabase Auth user |
| `org_id` | uuid | FK → `organizations.org_id` | Owning organization |
| `email` | text | NOT NULL, UNIQUE | Login and security email |
| `is_main` | boolean | DEFAULT false | True for Main Administrator |
| `is_verified` | boolean | DEFAULT false | Verified by Main Administrator |
| `created_at` | timestamptz | DEFAULT `now()` | Account creation timestamp |

#### user_accounts

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | uuid | PK, default `gen_random_uuid()` | Unique user identifier |
| `admin_id` | uuid | FK → `administrators.admin_id` | Administering admin |
| `display_name` | text | NOT NULL | Name shown in the UI |
| `accessibility_prefs` | jsonb | DEFAULT `'{}'` | Font size, contrast, layout prefs |
| `created_at` | timestamptz | DEFAULT `now()` | Account creation timestamp |

#### locations

| Column | Type | Constraints | Description |
|---|---|---|---|
| `location_id` | uuid | PK | Unique location identifier |
| `admin_id` | uuid | FK → `administrators` | Admin who created this location |
| `name` | text | NOT NULL | Human-readable room name |
| `description` | text | nullable | Optional notes about the space |
| `created_at` | timestamptz | DEFAULT `now()` | Record creation timestamp |

#### beacons

| Column | Type | Constraints | Description |
|---|---|---|---|
| `beacon_id` | uuid | PK | Unique beacon record identifier |
| `ble_uuid` | text | NOT NULL, UNIQUE | Broadcast UUID from hardware |
| `location_id` | uuid | FK → `locations` | Room this beacon represents |
| `title` | text | NOT NULL | Display name set by admin |
| `registered_by` | uuid | FK → `administrators` | Admin who paired the beacon |
| `created_at` | timestamptz | DEFAULT `now()` | Pairing timestamp |

#### vocabulary_words

| Column | Type | Constraints | Description |
|---|---|---|---|
| `word_id` | uuid | PK | Unique word identifier |
| `text` | text | NOT NULL | The word or phrase string |
| `icon_url` | text | nullable | Path in Supabase Storage bucket |
| `category` | text | nullable | Grouping label (e.g. `'actions'`) |
| `created_by` | uuid | FK → `administrators` | Admin who added the word |

#### location_words _(junction)_

| Column | Type | Constraints | Description |
|---|---|---|---|
| `location_id` | uuid | FK → `locations` | Linked location |
| `word_id` | uuid | FK → `vocabulary_words` | Linked word |
| `weight` | float4 | DEFAULT `1.0` | Admin-assigned relevance weight |
| PRIMARY KEY | — | `(location_id, word_id)` | Composite primary key |

#### usage_logs

| Column | Type | Constraints | Description |
|---|---|---|---|
| `log_id` | uuid | PK, default `gen_random_uuid()` | Unique log entry |
| `user_id` | uuid | FK → `user_accounts` | User who selected the word |
| `word_id` | uuid | FK → `vocabulary_words` | Word that was selected |
| `location_id` | uuid | FK → `locations`, nullable | Location when word was selected |
| `selected_at` | timestamptz | DEFAULT `now()` | Timestamp of selection event |

---

## 7. Algorithms

### 7.1 Location Resolution Algorithm

The system determines which location the user is currently in given a set of active BLE beacon signals via `react-native-ble-plx`. The algorithm operates as follows:

1. **Collect RSSI Samples** – The BLE scanner collects `(uuid, rssi)` pairs over a 500 ms window to smooth signal noise.
2. **Average RSSI** – For each unique `uuid`, compute the mean RSSI over the sampling window.
3. **Select Primary Beacon** – Choose the `uuid` with the highest mean RSSI. This maps directly to a `location_id` via the `beacons` table.
4. **Apply Proximity Weighting** – Beacons within 10 dBm of the primary beacon are considered "nearby." Vocabulary sets for nearby locations are blended into suggestions at a lower weight (configurable, default `0.3`) relative to the primary location (weight `1.0`).
5. **Hysteresis Guard** – To prevent rapid location switching as a user moves between areas, the resolved location only changes if the new primary beacon has been dominant for at least two consecutive sampling windows.

```js
function resolveLocation(beaconReadings) {
  const averaged = groupBy(beaconReadings, 'uuid').map(avgRssi);
  const primary  = maxBy(averaged, 'rssi');
  const nearby   = averaged.filter(b => b.rssi >= primary.rssi - 10);

  if (primary.uuid === lastPrimary) {
    stableCount++;
  } else {
    stableCount = 0;
    lastPrimary = primary.uuid;
  }

  if (stableCount >= 2) {
    currentLocation  = lookupLocation(primary.uuid);
    nearbyLocations  = nearby.map(b => lookupLocation(b.uuid));
  }
  return { currentLocation, nearbyLocations };
}
```

### 7.2 Word Suggestion Ranking Algorithm

Given a resolved location (and optionally a set of nearby locations), the system ranks the vocabulary for display in the AAC grid. The ranking score for each word is:

```
Score(word, user, location) = locationWeight × adminWeight × log(1 + usageCount)
```

Where:
- **locationWeight** – `1.0` for the primary location; `0.3` (configurable) for nearby locations.
- **adminWeight** – the `weight` value stored in `location_words` for this `(location, word)` pair; defaults to `1.0`.
- **usageCount** – the number of times this user has selected this word at this location, derived from `usage_logs`.

Words are sorted descending by Score. The top N words (default grid size: 4 × 6 = 24) fill the **Suggested** landing page. Remaining words are accessible through category tabs following the standard AAC grid layout.

### 7.3 Offline Fallback Strategy

When beacon detection fails or the device has no network connectivity, the system employs the following fallback cascade:

1. Attempt to load the last successfully fetched vocabulary set from AsyncStorage.
2. If no cached set exists for the current user, load a generic "core vocabulary" board stored as a static JSON asset bundled with the app.
3. Display a non-intrusive status banner informing the user that offline mode is active.
4. Periodically retry beacon scanning and network requests in the background; when connectivity is restored, seamlessly update the displayed vocabulary without interrupting the user.

---

## 8. Non-Functional Design Decisions

### 8.1 Responsiveness

The React Native app uses the `Dimensions` API and Flexbox to adapt the AAC icon grid to different device form factors (phones, tablets). The grid column count adjusts automatically — typically 3–4 columns on phones and 5–6 on tablets. Touch targets meet a minimum of **48 × 48 dp** in accordance with WCAG 2.1 AA and platform human interface guidelines.

### 8.2 Security

Supabase Row Level Security (RLS) policies ensure that:

- Administrators can only read and write records belonging to their own organization.
- Child user data is accessible only to administrators linked to that user.
- Usage logs are write-only for client devices; read access is restricted to administrators.

All client-server communication occurs over HTTPS. JWT tokens are short-lived (1 hour) and refreshed automatically by the Supabase JS client library. Tokens are stored in `expo-secure-store` (encrypted native keychain) rather than AsyncStorage.

### 8.3 Scalability

Supabase is backed by a managed PostgreSQL instance that can be vertically or horizontally scaled. Read-heavy vocabulary fetches are offloaded by caching at the client level (AsyncStorage) and, optionally, by a Supabase Edge Function that caches location vocabulary aggregates for sub-10 ms response times under high concurrency.

### 8.4 AAC Device Interoperability

The system exposes a JSON export endpoint that packages a user's vocabulary sets in **Open Board Format (OBF)**, a community standard for AAC content exchange. Compatible third-party AAC devices that support OBF can import this data directly, satisfying the non-functional requirement to detect and port context to other AAC devices.
