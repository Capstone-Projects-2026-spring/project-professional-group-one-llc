# Supabase Integration Guide (AACapp-mobile)

This app now supports loading room suggestions from Supabase and syncing interaction logs.

## 1) Create Supabase project

1. Go to Supabase and create a new project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql`.

## 2) Configure app environment

Create `AACapp-mobile/.env` using `.env.example`:

```bash
cp .env.example .env
```

Fill values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Restart Expo after editing env vars.

## 3) What is wired already

- `src/services/supabaseClient.js`
: Creates client from Expo public env vars.
- `src/services/roomRepository.js`
: Reads rooms and room word labels from Supabase.
- `src/hooks/useLocationDetection.js`
: Uses Supabase rooms when available, falls back to local `roomContexts.js`.
- `src/services/interactionRepository.js`
: Writes button interactions to `interaction_logs`.
- `src/hooks/useInteractionLogger.js`
: Keeps current in-memory logs and mirrors logs to Supabase.
- `src/services/userRepository.js`
: Helpers for user profile CRUD with Supabase Auth user IDs.

## 4) Suggested next integration step (auth)

If you want real per-user data, add Supabase Auth and then call:

- `getCurrentUser()` to resolve auth identity.
- `upsertUserProfile()` after sign-in.
- pass `userId` into interaction inserts for per-user analytics.

## 5) Verify quickly

Start app:

```bash
npm start
```

Expected behavior:
- App still works if Supabase env vars are missing (local fallback).
- If env vars are present and tables are seeded, room suggestions load from Supabase.
- Button presses are inserted into `interaction_logs`.
