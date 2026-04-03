# Set up app test environment
- download expo go on app store to test the mobile ios evnironment on your device

- go to your terminal and cd to AACapp-mobile
- npm install
- npx expo start
- scan the qr code on terminal with your camera
- you should now see the app

## Admin analytics
- Open `Settings > Admin Analytics` in the mobile app to load Supabase interaction analytics.
- This flow does not use login yet; it is protected by a shared admin access code.
- The code is validated server-side by the `get_interaction_analytics` RPC.
- Setup details are documented in `AACapp-mobile/SUPABASE_SETUP.md`.

# Initial commit

AAC Beacon is a smart communication tool designed to make finding and using frequently needed words faster and easier. When a user connects to the beacon in a room, it automatically provides access to a personalized set of words without the need to search through files or menus. Each beacon is tailored to the user’s favorite words for that specific room, saving time and improving communication efficiency.

## Collaborators
- Walid Parast
- Joey Slepski
- Junwei Chen
- Cian Brownlee
- Benjamin No
- Joshua Slootsky
- Daniel Galvez
