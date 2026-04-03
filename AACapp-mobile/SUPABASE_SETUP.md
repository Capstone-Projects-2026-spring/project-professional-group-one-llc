# Supabase Integration Guide (AACapp-mobile)

This app now supports loading room suggestions from Supabase and syncing interaction logs.
It also supports an admin-only analytics dashboard backed by a Supabase RPC.

## 1) Create Supabase project

1. Go to Supabase and create a new project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql`.

## 1.1) Configure the admin analytics access code

After running `supabase/schema.sql`, insert a hashed shared access code for admins:

```sql
insert into public.admin_access_config (id, passcode_hash)
values (
  true,
  extensions.crypt(
    'replace-with-a-strong-admin-code',
    extensions.gen_salt('bf')
  )
)
on conflict (id) do update
set passcode_hash = excluded.passcode_hash,
    updated_at = now();
```

The app sends the entered code to the `get_interaction_analytics` RPC. Supabase validates the code server-side and only then returns aggregated analytics and recent interaction data.

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
: Writes button interactions to `interaction_logs` and reads admin analytics via RPC.
- `src/hooks/useInteractionLogger.js`
: Keeps current in-memory logs and mirrors logs to Supabase.
- `src/hooks/useAdminAnalytics.js`
: Loads and refreshes admin analytics for the current app session.
- `src/components/AdminAccessModal.js`
: Prompts for the shared admin access code.
- `src/components/AdminAnalyticsModal.js`
: Displays aggregated interaction counts, top buttons, top rooms, and recent activity.
- `src/services/userRepository.js`
: Helpers for user profile CRUD with Supabase Auth user IDs.

## 4) Current admin access model

Admin analytics does not depend on login yet. Access is controlled by the shared passcode stored in `admin_access_config` and validated inside the `get_interaction_analytics` function. This is a temporary bridge until full admin auth exists.

## 5) Suggested next integration step (auth)

If you want real per-user data and stronger admin controls, add Supabase Auth and then call:

- `getCurrentUser()` to resolve auth identity.
- `upsertUserProfile()` after sign-in.
- pass `userId` into interaction inserts for per-user analytics.

## 6) Verify quickly

Start app:

```bash
npm start
```

Expected behavior:
- App still works if Supabase env vars are missing (local fallback).
- If env vars are present and tables are seeded, room suggestions load from Supabase.
- Button presses are inserted into `interaction_logs`.
- Admins can open `Settings > Admin Analytics`, enter the shared code, and view the latest Supabase summary.
