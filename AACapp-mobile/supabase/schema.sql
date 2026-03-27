-- Core AAC schema for Supabase (PostgreSQL)

create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id text primary key,
  label text not null,
  emoji text,
  color text,
  beacon_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.word_labels (
  id bigint generated always as identity primary key,
  label text not null,
  arasaac_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists word_labels_label_key
  on public.word_labels (label);

create table if not exists public.room_word_labels (
  room_id text not null references public.rooms(id) on delete cascade,
  word_label_id bigint not null references public.word_labels(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (room_id, word_label_id),
  unique (room_id, position)
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interaction_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  device_id text not null,
  button_name text not null,
  pressed_at timestamptz not null,
  room_id text,
  room_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.word_labels enable row level security;
alter table public.room_word_labels enable row level security;
alter table public.user_profiles enable row level security;
alter table public.interaction_logs enable row level security;

drop policy if exists "Public can read rooms" on public.rooms;
create policy "Public can read rooms"
  on public.rooms
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read labels" on public.word_labels;
create policy "Public can read labels"
  on public.word_labels
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read room-label links" on public.room_word_labels;
create policy "Public can read room-label links"
  on public.room_word_labels
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "App can write interaction logs" on public.interaction_logs;
create policy "App can write interaction logs"
  on public.interaction_logs
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can read logs" on public.interaction_logs;
create policy "Authenticated users can read logs"
  on public.interaction_logs
  for select
  to authenticated
  using (user_id = auth.uid() or user_id is null);
