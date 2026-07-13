-- WardrobePro signed-room Cloud Sync schema
--
-- The browser has no table privileges. All reads and compare-and-swap writes go
-- through supabase/functions/wp-cloud-sync-room with a signed room capability.

create table if not exists public.wp_cloud_sync_rooms (
  tenant_id text not null,
  store_id text not null,
  room text not null,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now(),
  updated_by text not null default 'system',
  primary key (tenant_id, store_id, room),
  constraint wp_cloud_sync_rooms_tenant_id_check
    check (tenant_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint wp_cloud_sync_rooms_store_id_check
    check (store_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint wp_cloud_sync_rooms_room_check
    check (room ~ '^[a-zA-Z0-9_-]{1,128}(::[a-zA-Z0-9_-]{1,64})*$'),
  constraint wp_cloud_sync_rooms_payload_size_check
    check (octet_length(payload::text) <= 2000000)
);

create index if not exists wp_cloud_sync_rooms_updated_at_idx
  on public.wp_cloud_sync_rooms (tenant_id, store_id, updated_at desc);

create or replace function public.wp_cloud_sync_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

drop trigger if exists wp_cloud_sync_rooms_set_updated_at on public.wp_cloud_sync_rooms;
create trigger wp_cloud_sync_rooms_set_updated_at
before update on public.wp_cloud_sync_rooms
for each row execute function public.wp_cloud_sync_set_updated_at();

-- One bounded row per hashed client/action bucket. Raw IP addresses are never stored.
create table if not exists public.wp_cloud_sync_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 1)
);

create or replace function public.wp_cloud_sync_consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_allowed boolean := false;
begin
  if p_bucket_key is null or length(p_bucket_key) < 16 then
    raise exception 'invalid rate-limit key';
  end if;
  if p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate-limit policy';
  end if;

  insert into public.wp_cloud_sync_rate_limits (bucket_key, window_started_at, request_count)
  values (p_bucket_key, v_now, 1)
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when public.wp_cloud_sync_rate_limits.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
      then v_now
      else public.wp_cloud_sync_rate_limits.window_started_at
    end,
    request_count = case
      when public.wp_cloud_sync_rate_limits.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
      then 1
      else public.wp_cloud_sync_rate_limits.request_count + 1
    end
  where
    public.wp_cloud_sync_rate_limits.window_started_at
      <= v_now - make_interval(secs => p_window_seconds)
    or public.wp_cloud_sync_rate_limits.request_count < p_limit
  returning true into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

-- Defense in depth: exposed browser roles cannot query either table or execute
-- the rate-limit owner. The Edge Function uses the server-only service role.
alter table public.wp_cloud_sync_rooms enable row level security;
alter table public.wp_cloud_sync_rooms force row level security;
alter table public.wp_cloud_sync_rate_limits enable row level security;
alter table public.wp_cloud_sync_rate_limits force row level security;

revoke all on table public.wp_cloud_sync_rooms from anon, authenticated, public;
revoke all on table public.wp_cloud_sync_rate_limits from anon, authenticated, public;
revoke all on function public.wp_cloud_sync_consume_rate_limit(text, integer, integer)
  from anon, authenticated, public;

grant select, insert, update on table public.wp_cloud_sync_rooms to service_role;
grant select, insert, update on table public.wp_cloud_sync_rate_limits to service_role;
grant execute on function public.wp_cloud_sync_consume_rate_limit(text, integer, integer)
  to service_role;
revoke delete on table public.wp_cloud_sync_rooms from service_role;
