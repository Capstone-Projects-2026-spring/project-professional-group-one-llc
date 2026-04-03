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

create table if not exists public.admin_access_config (
  id boolean primary key default true,
  passcode_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_access_config_singleton check (id = true)
);

alter table public.rooms enable row level security;
alter table public.word_labels enable row level security;
alter table public.room_word_labels enable row level security;
alter table public.user_profiles enable row level security;
alter table public.interaction_logs enable row level security;
alter table public.admin_access_config enable row level security;

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

create or replace function public.get_interaction_analytics(
  admin_access_code text,
  hours_window integer default 168,
  recent_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  bounded_recent_limit integer := greatest(1, least(coalesce(recent_limit, 50), 200));
  bounded_hours_window integer := greatest(1, least(coalesce(hours_window, 168), 24 * 90));
begin
  select passcode_hash
  into stored_hash
  from public.admin_access_config
  where id = true;

  if stored_hash is null then
    raise exception 'Admin analytics is not configured.';
  end if;

  if admin_access_code is null or btrim(admin_access_code) = '' then
    raise exception 'Admin access code is required.';
  end if;

  if extensions.crypt(admin_access_code, stored_hash) <> stored_hash then
    raise exception 'Invalid admin access code.';
  end if;

  return (
    with filtered_logs as (
      select *
      from public.interaction_logs
      where pressed_at >= now() - make_interval(hours => bounded_hours_window)
    ),
    top_buttons as (
      select
        button_name,
        count(*)::int as total
      from filtered_logs
      group by button_name
      order by total desc, button_name asc
      limit 5
    ),
    top_rooms as (
      select
        coalesce(nullif(room_label, ''), 'General') as room_label,
        count(*)::int as total
      from filtered_logs
      group by coalesce(nullif(room_label, ''), 'General')
      order by total desc, room_label asc
      limit 5
    ),
    recent_logs as (
      select
        id,
        device_id,
        button_name,
        pressed_at,
        room_id,
        room_label,
        metadata
      from filtered_logs
      order by pressed_at desc
      limit bounded_recent_limit
    )
    select jsonb_build_object(
      'windowHours', bounded_hours_window,
      'generatedAt', now(),
      'totals', jsonb_build_object(
        'interactions', (select count(*)::int from filtered_logs),
        'devices', (select count(distinct device_id)::int from filtered_logs),
        'rooms', (
          select count(distinct coalesce(nullif(room_label, ''), 'General'))::int
          from filtered_logs
        ),
        'buttons', (select count(distinct button_name)::int from filtered_logs)
      ),
      'topButtons', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'buttonName', button_name,
            'total', total
          )
        )
        from top_buttons
      ), '[]'::jsonb),
      'topRooms', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'roomLabel', room_label,
            'total', total
          )
        )
        from top_rooms
      ), '[]'::jsonb),
      'recentLogs', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'deviceId', device_id,
            'buttonName', button_name,
            'pressedAt', pressed_at,
            'roomId', room_id,
            'roomLabel', room_label,
            'metadata', metadata
          )
        )
        from recent_logs
      ), '[]'::jsonb)
    )
  );
end;
$$;

grant execute on function public.get_interaction_analytics(text, integer, integer)
  to anon, authenticated;
