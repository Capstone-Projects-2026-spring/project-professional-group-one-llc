---
sidebar_position: 5
---

# Use-Case Descriptions

### Use Case 1 - Select a Room

<i>As a user, I want to manually select a room so that the app displays vocabulary relevant to my current location.</i>

1. The user opens the AAC Beacon mobile application.
2. The user views the vertical room selector rail on the right side of the screen.
3. The user taps a room chip (e.g., "Kitchen", "Bedroom").
4. The app sets the active room and fetches that room's suggested word set.
5. The word grid updates to display room-specific vocabulary merged with core words.

---

### Use Case 2 - Build and Speak a Sentence

<i>As a user, I want to tap words to build a sentence and have it spoken aloud so that I can communicate efficiently.</i>

1. The user opens the AAC Beacon mobile application.
2. The user taps a word on the word grid; the word is spoken immediately as audio feedback and added to the sentence bar.
3. The user continues tapping words to build a sentence.
4. The user taps the speaker button in the sentence bar to speak the full sentence aloud.
5. The user can tap ⌫ to remove the last word, or the trash icon to clear the entire sentence.

---

### Use Case 3 - Connecting to a Beacon

<i>As a child user, I want to connect to a beacon in a room so that I can quickly access vocabulary tailored to that location.</i>

1. The user enters a room containing an AAC Beacon device.
2. The user opens the AAC Beacon mobile or web application.
3. The application detects the nearby beacon and connects to the device. 
4. The application loads and displays the personalized set of frequently used words associated with that room.

---

### Use Case 4 - Using Vocabulary for Communication

<i>As a user, I want to quickly select words from my personalized vocabulary so that I can communicate efficiently.</i>

1. The user connects to a beacon in a room.
2. The user views the vocabulary set displayed on their device.
3. The user selects words or phrases from the list.
4. The application outputs the selected words through text or speech.
5. The user continues selecting words as needed to complete communication.

---

### Use Case 5 - Access Admin Analytics

<i>As an admin, I want to unlock the analytics dashboard so that I can review usage data and interaction trends.</i>

1. The admin taps the settings icon in the app header.
2. The admin selects **Admin Analytics** from the Settings menu.
3. The Admin Access Modal appears, prompting for the shared admin access code.
4. The admin enters the code and taps **Unlock**.
5. The code is validated server-side via the `get_interaction_analytics` Supabase RPC.
6. If valid, the Admin Analytics Modal opens showing total interactions, devices, rooms, and buttons used, as well as top buttons, top rooms, and a recent activity log.
7. The admin can tap **Refresh** to pull updated data, or **Close** to exit and clear the session.
8. If the code is incorrect, an error message is displayed and the modal remains open.

---

### Use Case 6 - Beacon Connection Failure Handling

<i>As a user, I want to be notified if a beacon connection fails so that I can still access my communication tools.</i>

1. The child user attempts to connect to a beacon when entering a room.
2. The system fails to detect or connect to the beacon.
3. The admin user receives a notification explaining the connection failure.
4. The application automatically loads a default or previously used vocabulary set.
5. The child user continues communication without interruption.
