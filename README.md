# AAC Beacon

# Initial commit

AAC Beacon is a smart communication tool designed to make finding and using frequently needed words faster and easier. When a user connects to the beacon in a room, it automatically provides access to a personalized set of words without the need to search through files or menus. Each beacon is tailored to the user's favorite words for that specific room, saving time and improving communication efficiency.

## Collaborators
- Walid Parast
- Joey Slepski
- Junwei Chen
- Cian Brownlee
- Benjamin No
- Joshua Slootsky
- Daniel Galvez

---

## Setting Up the Test Environment

### Prerequisites
- **Node.js** (v18 or later recommended)
- **npm** (comes with Node.js)
- **Expo Go** app installed on your iOS or Android device
  - iOS: [Download on the App Store](https://apps.apple.com/app/expo-go/id982107779)
  - Android: [Download on Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Steps

1. **Navigate to the app directory**
   ```bash
   cd AACapp-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the `.env` file or create one in `AACapp-mobile/` with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   > See `AACapp-mobile/SUPABASE_SETUP.md` for full Supabase setup instructions.

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Open the app on your device**
   - A QR code will appear in your terminal.
   - Open your **camera app** (iOS) or the **Expo Go app** (Android) and scan the QR code.
   - The app will load directly on your device.

### Running Tests
```bash
npm test
```

---

## Admin Analytics

- Open **Settings → Admin Analytics** in the mobile app to load Supabase interaction analytics.
- This flow does not use login yet; it is protected by a shared admin access code.
- The code is validated server-side by the `get_interaction_analytics` RPC.
- Setup details are documented in `AACapp-mobile/SUPABASE_SETUP.md`.
