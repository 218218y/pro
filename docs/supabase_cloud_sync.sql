-- Supabase Cloud Sync (OPEN) for WardrobePro
--
-- This schema supports:
-- - a public shared room: room='public'
-- - optional private rooms: room='<any string>' (via ?room=...)
--
-- WARNING (by design for this project):
-- This setup is intentionally OPEN (anyone with the URL can read/write).
-- We DISABLE RLS to avoid Realtime auth/RLS DB pool bottlenecks for public sync.
-- If you want to lock it down later, switch to Supabase Auth + RLS and keep the app on the same broadcast+REST sync model.

create table if not exists public.wp_shared_state (
  room text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.wp_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wp_shared_state_set_updated_at on public.wp_shared_state;
create trigger wp_shared_state_set_updated_at
before update on public.wp_shared_state
for each row execute function public.wp_set_updated_at();

-- Create the default public room row (optional; app can also create it).
insert into public.wp_shared_state (room, payload)
values ('public', '{}'::jsonb)
on conflict (room) do nothing;

-- OPEN (no auth): disable RLS and grant anon CRUD directly.
alter table public.wp_shared_state disable row level security;

-- Clean up old open policies if they existed from a previous setup.
drop policy if exists "public read" on public.wp_shared_state;
drop policy if exists "public insert" on public.wp_shared_state;
drop policy if exists "public update" on public.wp_shared_state;
drop policy if exists "public delete" on public.wp_shared_state;

-- Allow browser clients (anon key) to read/write without login.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.wp_shared_state to anon;
grant select, insert, update, delete on table public.wp_shared_state to authenticated;

-- -------------------------
-- Realtime (recommended for this project)
-- -------------------------
-- Recommended app mode is Supabase Realtime Broadcast (public channel), NOT Postgres Changes.
-- The app sends a lightweight broadcast hint after each successful write, and other clients
-- pull the row via REST. This avoids DB authorization pool bottlenecks for open/public sync.
--
-- Dashboard settings to verify:
--   Project Settings -> API -> enable anon access to this project (normal for client apps)
--   Realtime Settings -> Enable Realtime service = ON
--   Realtime Settings -> Allow public access to channels = ON
--
-- No publication setup is required for Broadcast mode.
--
