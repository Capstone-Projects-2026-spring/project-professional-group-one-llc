# Supabase Integration Guide (AACapp-mobile)

This app uses Supabase for:
- Auth (email/password)
- Role-based profile storage (`user` or `admin`)
- Room + vocabulary data
- Interaction logs

## 1) Create and initialize Supabase

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Run `supabase/seed.sql`.

Important:
- The schema includes a trigger that auto-creates `public.user_profiles` when a new auth user is created.
- The role is pulled from signup metadata (`role`) and constrained to `user|admin`.

## 2) Configure environment variables in Expo

Create `AACapp-mobile/.env` with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Then restart Expo:

```bash
npx expo start -c
```

## 3) Configure Supabase Auth settings

In Supabase Dashboard:

1. Go to Authentication -> Providers -> Email.
2. Enable Email provider.
3. Choose email confirmation behavior:
- If ON: users must confirm email before first login.
- If OFF: users can login immediately after register.

For local/dev testing, turning confirmation OFF is easiest.

## 4) App behavior after this setup

- Login uses email/password against Supabase.
- Register screen lets user pick role (`user` or `admin`) and set display name.
- Profile role is stored in `public.user_profiles.role`.
- Room selection enable/disable management has been removed (no one can toggle room availability).
- Logout is available from app header.

## 5) Quick verification checklist

1. Register a new account as `user`.
2. Register another account as `admin`.
3. In Supabase SQL Editor, run:

```sql
select id, display_name, role, created_at
from public.user_profiles
order by created_at desc;
```

4. Verify both accounts exist with correct roles.
5. Login and logout from the app.

## 6) Optional hardening recommendation

Right now, users can self-select `admin` at signup because you requested it.
For production, restrict admin creation by:
- removing `admin` option from the register UI, and
- promoting admins only via SQL by trusted operators.
