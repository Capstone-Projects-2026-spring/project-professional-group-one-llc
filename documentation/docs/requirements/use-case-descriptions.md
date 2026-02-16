---
sidebar_position: 5
---

# Use-Case Descriptions

### Use Case 1 - Account Creation

<i>As a user, it is important that I can create an account so that I can store and access my personalized communication preferences.</i>

1. Upon accessing the AAC Beacon web application for the first time, the user is directed to a landing page with options to register or log in.
2. The user selects the 'Register' button to access the account registration form.
3. The user inputs their username, email address, password, chooses if it's an admin or child account, and any optional accessibility preferences, then selects the 'Sign Up' button.
4. If the information is valid, the user receives confirmation that their account was successfully created.
5. The user selects the 'Sign In' link and enters their credentials.
6. The user is redirected to the home page.

---

### Use Case 2 - Signing In

<i>As a user, I want to log into my account so that I can access my personalized communication vocabulary.</i>

1. The user accesses the AAC Beacon application.
2. The user selects the 'Login' button to access the sign-in page.
3. The user enters their email address and password.
4. If the credentials are valid, the user is redirected to the home page.
5. If credentials are invalid, the user receives an error notification and is prompted to try again.

---

### Use Case 3 - Connecting to a Beacon

<i>As a child user, I want to connect to a beacon in a room so that I can quickly access vocabulary tailored to that location.</i>

1. The user enters a room containing an AAC Beacon device.
2. The user opens the AAC Beacon mobile or web application.
3. The application detects the nearby beacon and connects to the device. 
4. The application loads and displays the personalized set of frequently used words associated with that room.
5. I, the child, wish to play with LEGO.
6. I look down onto my AAC board and see new words have appeared, like "LEGO" and "play", since I have entered the room.
   

---

### Use Case 4 - Using Vocabulary for Communication

<i>As a user, I want to quickly select words from my personalized vocabulary so that I can communicate efficiently.</i>

1. The user connects to a beacon in a room.
2. The user views the vocabulary set displayed on their device.
3. The user selects words or phrases from the list.
4. The application outputs the selected words through text or speech.
5. The user continues selecting words as needed to complete communication.

---

### Use Case 5 - Updating Favorite Words

<i>As an admin user, I want to update my frequently used words so that the system reflects my communication needs.</i>

1. The user navigates to their vocabulary preferences page.
2. The user selects a vocabulary set linked to a specific room or general usage.
3. The user adds new words or removes unused words.
4. The user saves their updates.
5. The system synchronizes the updated vocabulary with associated beacons.

---

### Use Case 6 - Beacon Connection Failure Handling

<i>As a user, I want to be notified if a beacon connection fails so that I can still access my communication tools.</i>

1. The child user attempts to connect to a beacon when entering a room.
2. The system fails to detect or connect to the beacon.
3. The admin user receives a notification explaining the connection failure.
4. The application automatically loads a default or previously used vocabulary set.
5. The child user continues communication without interruption.

