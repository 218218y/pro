-- WardrobePro Cloud Sync retention owner.
--
-- Apply after supabase_cloud_sync.sql and before deploying the Edge Function
-- version that calls wp_cloud_sync_touch_room_lease(). This migration does not
-- enable deletion: the Bargig policy is created disabled and every cleanup API
-- defaults to dry-run.

begin;
set local statement_timeout = '60s';

create schema if not exists wp_cloud_sync_private;
revoke all on schema wp_cloud_sync_private from public, anon, authenticated, service_role;

create table if not exists wp_cloud_sync_private.retention_policies (
  tenant_id text not null,
  store_id text not null,
  public_room text not null,
  private_room_retention interval not null default interval '45 days',
  room_batch_limit integer not null default 100,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, store_id),
  constraint wp_cloud_sync_retention_tenant_id_check
    check (tenant_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint wp_cloud_sync_retention_store_id_check
    check (store_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint wp_cloud_sync_retention_public_room_check
    check (public_room ~ '^[a-zA-Z0-9_-]{1,128}$'),
  constraint wp_cloud_sync_retention_interval_check
    check (private_room_retention between interval '1 day' and interval '365 days'),
  constraint wp_cloud_sync_retention_room_batch_check
    check (room_batch_limit between 1 and 1000)
);

create table if not exists wp_cloud_sync_private.room_leases (
  tenant_id text not null,
  store_id text not null,
  room text not null,
  is_public boolean not null,
  last_activity_at timestamptz not null,
  expires_at timestamptz,
  primary key (tenant_id, store_id, room),
  constraint wp_cloud_sync_room_lease_room_check
    check (room ~ '^[a-zA-Z0-9_-]{1,128}$'),
  constraint wp_cloud_sync_room_lease_expiry_check
    check (
      (is_public and expires_at is null)
      or (not is_public and expires_at is not null)
    )
);

create index if not exists wp_cloud_sync_room_leases_expiry_idx
  on wp_cloud_sync_private.room_leases (tenant_id, store_id, expires_at)
  where expires_at is not null;

create table if not exists wp_cloud_sync_private.retention_settings (
  singleton boolean primary key default true check (singleton),
  rate_limit_retention interval not null default interval '48 hours',
  rate_limit_batch_limit integer not null default 5000,
  audit_retention interval not null default interval '90 days',
  constraint wp_cloud_sync_rate_retention_interval_check
    check (rate_limit_retention between interval '1 hour' and interval '30 days'),
  constraint wp_cloud_sync_rate_retention_batch_check
    check (rate_limit_batch_limit between 1 and 50000),
  constraint wp_cloud_sync_audit_retention_interval_check
    check (audit_retention between interval '7 days' and interval '365 days')
);

create table if not exists wp_cloud_sync_private.cleanup_audit (
  run_id bigint generated always as identity primary key,
  run_at timestamptz not null default now(),
  scope text not null check (scope in ('room-family', 'rate-limit')),
  tenant_id text,
  store_id text,
  candidate_unit_count integer not null check (candidate_unit_count >= 0),
  candidate_row_count integer not null check (candidate_row_count >= 0),
  deleted_unit_count integer not null check (deleted_unit_count >= 0),
  deleted_row_count integer not null check (deleted_row_count >= 0)
);

create index if not exists wp_cloud_sync_cleanup_audit_run_at_idx
  on wp_cloud_sync_private.cleanup_audit (run_at);

revoke all on all tables in schema wp_cloud_sync_private
  from public, anon, authenticated, service_role;
revoke all on all sequences in schema wp_cloud_sync_private
  from public, anon, authenticated, service_role;

insert into wp_cloud_sync_private.retention_settings (singleton)
values (true)
on conflict (singleton) do nothing;

insert into wp_cloud_sync_private.retention_policies (
  tenant_id,
  store_id,
  public_room,
  private_room_retention,
  room_batch_limit,
  enabled
)
values ('bargig', 'bargig', 'public', interval '45 days', 100, false)
on conflict (tenant_id, store_id) do nothing;

create or replace function public.wp_cloud_sync_touch_room_lease(
  p_tenant_id text,
  p_store_id text,
  p_room text,
  p_public_room text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_policy wp_cloud_sync_private.retention_policies%rowtype;
  v_is_public boolean;
  v_expires_at timestamptz;
begin
  if p_tenant_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_store_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_room !~ '^[a-zA-Z0-9_-]{1,128}$'
     or p_public_room !~ '^[a-zA-Z0-9_-]{1,128}$' then
    raise exception 'invalid Cloud Sync lease identity';
  end if;

  select *
  into v_policy
  from wp_cloud_sync_private.retention_policies policy
  where policy.tenant_id = p_tenant_id
    and policy.store_id = p_store_id;

  if not found then
    raise exception 'Cloud Sync retention policy is not configured for tenant/store';
  end if;
  if v_policy.public_room <> p_public_room then
    raise exception 'Cloud Sync public room does not match retention policy';
  end if;

  v_is_public := p_room = v_policy.public_room;
  v_expires_at := case
    when v_is_public then null
    else v_now + v_policy.private_room_retention
  end;

  insert into wp_cloud_sync_private.room_leases (
    tenant_id,
    store_id,
    room,
    is_public,
    last_activity_at,
    expires_at
  )
  values (p_tenant_id, p_store_id, p_room, v_is_public, v_now, v_expires_at)
  on conflict (tenant_id, store_id, room) do update
  set
    is_public = excluded.is_public,
    last_activity_at = excluded.last_activity_at,
    expires_at = excluded.expires_at;

  return v_expires_at;
end;
$$;

revoke all on function public.wp_cloud_sync_touch_room_lease(text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.wp_cloud_sync_touch_room_lease(text, text, text, text)
  to service_role;

-- Backfill one lease per existing base room. Re-running this statement only
-- moves activity/expiry forward; it never shortens a live lease.
insert into wp_cloud_sync_private.room_leases (
  tenant_id,
  store_id,
  room,
  is_public,
  last_activity_at,
  expires_at
)
select
  room_row.tenant_id,
  room_row.store_id,
  split_part(room_row.room, '::', 1) as room,
  split_part(room_row.room, '::', 1) = policy.public_room as is_public,
  max(room_row.updated_at) as last_activity_at,
  case
    when split_part(room_row.room, '::', 1) = policy.public_room then null
    else max(room_row.updated_at) + policy.private_room_retention
  end as expires_at
from public.wp_cloud_sync_rooms room_row
join wp_cloud_sync_private.retention_policies policy
  on policy.tenant_id = room_row.tenant_id
 and policy.store_id = room_row.store_id
group by room_row.tenant_id, room_row.store_id, split_part(room_row.room, '::', 1),
  policy.public_room, policy.private_room_retention
on conflict (tenant_id, store_id, room) do update
set
  is_public = excluded.is_public,
  last_activity_at = greatest(
    wp_cloud_sync_private.room_leases.last_activity_at,
    excluded.last_activity_at
  ),
  expires_at = case
    when excluded.is_public then null
    else greatest(wp_cloud_sync_private.room_leases.expires_at, excluded.expires_at)
  end;

create or replace function wp_cloud_sync_private.cleanup_store(
  p_tenant_id text,
  p_store_id text,
  p_dry_run boolean default true,
  p_batch_limit integer default null,
  p_now timestamptz default clock_timestamp()
)
returns table (
  dry_run boolean,
  tenant_id text,
  store_id text,
  candidate_room_family_count integer,
  candidate_room_row_count integer,
  deleted_room_family_count integer,
  deleted_room_row_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy wp_cloud_sync_private.retention_policies%rowtype;
  v_effective_limit integer;
  v_room text;
  v_rooms text[] := array[]::text[];
  v_candidate_family_count integer := 0;
  v_candidate_row_count integer := 0;
  v_deleted_family_count integer := 0;
  v_deleted_row_count integer := 0;
begin
  select *
  into v_policy
  from wp_cloud_sync_private.retention_policies policy
  where policy.tenant_id = p_tenant_id
    and policy.store_id = p_store_id;

  if not found then
    raise exception 'Cloud Sync retention policy is not configured for tenant/store';
  end if;
  if not p_dry_run and not v_policy.enabled then
    raise exception 'Cloud Sync retention policy is disabled for tenant/store';
  end if;

  v_effective_limit := least(coalesce(p_batch_limit, v_policy.room_batch_limit), 1000);
  if v_effective_limit < 1 then
    raise exception 'Cloud Sync cleanup batch limit must be positive';
  end if;

  if p_dry_run then
    for v_room in
      select lease.room
      from wp_cloud_sync_private.room_leases lease
      where lease.tenant_id = p_tenant_id
        and lease.store_id = p_store_id
        and not lease.is_public
        and lease.expires_at <= p_now
      order by lease.expires_at, lease.room
      limit v_effective_limit
    loop
      v_rooms := array_append(v_rooms, v_room);
    end loop;
  else
    for v_room in
      select lease.room
      from wp_cloud_sync_private.room_leases lease
      where lease.tenant_id = p_tenant_id
        and lease.store_id = p_store_id
        and not lease.is_public
        and lease.expires_at <= p_now
      order by lease.expires_at, lease.room
      limit v_effective_limit
      for update skip locked
    loop
      v_rooms := array_append(v_rooms, v_room);
    end loop;
  end if;

  v_candidate_family_count := coalesce(array_length(v_rooms, 1), 0);
  select count(*)::integer
  into v_candidate_row_count
  from public.wp_cloud_sync_rooms room_row
  where room_row.tenant_id = p_tenant_id
    and room_row.store_id = p_store_id
    and split_part(room_row.room, '::', 1) = any(v_rooms);

  if not p_dry_run and v_candidate_family_count > 0 then
    delete from public.wp_cloud_sync_rooms room_row
    where room_row.tenant_id = p_tenant_id
      and room_row.store_id = p_store_id
      and split_part(room_row.room, '::', 1) = any(v_rooms);
    get diagnostics v_deleted_row_count = row_count;

    delete from wp_cloud_sync_private.room_leases lease
    where lease.tenant_id = p_tenant_id
      and lease.store_id = p_store_id
      and lease.room = any(v_rooms)
      and not lease.is_public
      and lease.expires_at <= p_now;
    get diagnostics v_deleted_family_count = row_count;

    insert into wp_cloud_sync_private.cleanup_audit (
      run_at,
      scope,
      tenant_id,
      store_id,
      candidate_unit_count,
      candidate_row_count,
      deleted_unit_count,
      deleted_row_count
    )
    values (
      p_now,
      'room-family',
      p_tenant_id,
      p_store_id,
      v_candidate_family_count,
      v_candidate_row_count,
      v_deleted_family_count,
      v_deleted_row_count
    );
  end if;

  return query select
    p_dry_run,
    p_tenant_id,
    p_store_id,
    v_candidate_family_count,
    v_candidate_row_count,
    v_deleted_family_count,
    v_deleted_row_count;
end;
$$;

create or replace function wp_cloud_sync_private.cleanup_rate_limits(
  p_dry_run boolean default true,
  p_batch_limit integer default null,
  p_now timestamptz default clock_timestamp()
)
returns table (
  dry_run boolean,
  candidate_bucket_count integer,
  deleted_bucket_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings wp_cloud_sync_private.retention_settings%rowtype;
  v_effective_limit integer;
  v_bucket_key text;
  v_bucket_keys text[] := array[]::text[];
  v_candidate_count integer := 0;
  v_deleted_count integer := 0;
begin
  select * into strict v_settings
  from wp_cloud_sync_private.retention_settings settings
  where settings.singleton;

  v_effective_limit := least(coalesce(p_batch_limit, v_settings.rate_limit_batch_limit), 50000);
  if v_effective_limit < 1 then
    raise exception 'Cloud Sync rate-limit cleanup batch limit must be positive';
  end if;

  if p_dry_run then
    for v_bucket_key in
      select bucket.bucket_key
      from public.wp_cloud_sync_rate_limits bucket
      where bucket.window_started_at <= p_now - v_settings.rate_limit_retention
      order by bucket.window_started_at, bucket.bucket_key
      limit v_effective_limit
    loop
      v_bucket_keys := array_append(v_bucket_keys, v_bucket_key);
    end loop;
  else
    for v_bucket_key in
      select bucket.bucket_key
      from public.wp_cloud_sync_rate_limits bucket
      where bucket.window_started_at <= p_now - v_settings.rate_limit_retention
      order by bucket.window_started_at, bucket.bucket_key
      limit v_effective_limit
      for update skip locked
    loop
      v_bucket_keys := array_append(v_bucket_keys, v_bucket_key);
    end loop;
  end if;

  v_candidate_count := coalesce(array_length(v_bucket_keys, 1), 0);
  if not p_dry_run then
    delete from wp_cloud_sync_private.cleanup_audit audit
    where audit.run_at < p_now - v_settings.audit_retention;

    if v_candidate_count > 0 then
      delete from public.wp_cloud_sync_rate_limits bucket
      where bucket.bucket_key = any(v_bucket_keys)
        and bucket.window_started_at <= p_now - v_settings.rate_limit_retention;
      get diagnostics v_deleted_count = row_count;

      insert into wp_cloud_sync_private.cleanup_audit (
        run_at,
        scope,
        candidate_unit_count,
        candidate_row_count,
        deleted_unit_count,
        deleted_row_count
      )
      values (
        p_now,
        'rate-limit',
        v_candidate_count,
        v_candidate_count,
        v_deleted_count,
        v_deleted_count
      );
    end if;
  end if;

  return query select p_dry_run, v_candidate_count, v_deleted_count;
end;
$$;

create or replace function wp_cloud_sync_private.run_retention(
  p_dry_run boolean default true,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy record;
  v_store_result jsonb;
  v_store_results jsonb := '[]'::jsonb;
  v_rate_result jsonb;
begin
  for v_policy in
    select policy.tenant_id, policy.store_id, policy.room_batch_limit
    from wp_cloud_sync_private.retention_policies policy
    where policy.enabled or p_dry_run
    order by policy.tenant_id, policy.store_id
  loop
    select to_jsonb(result)
    into v_store_result
    from wp_cloud_sync_private.cleanup_store(
      v_policy.tenant_id,
      v_policy.store_id,
      p_dry_run,
      v_policy.room_batch_limit,
      p_now
    ) result;
    v_store_results := v_store_results || jsonb_build_array(v_store_result);
  end loop;

  select to_jsonb(result)
  into v_rate_result
  from wp_cloud_sync_private.cleanup_rate_limits(p_dry_run, null, p_now) result;

  return jsonb_build_object(
    'dryRun', p_dry_run,
    'runAt', p_now,
    'stores', v_store_results,
    'rateLimits', v_rate_result
  );
end;
$$;

revoke all on function wp_cloud_sync_private.cleanup_store(text, text, boolean, integer, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function wp_cloud_sync_private.cleanup_rate_limits(boolean, integer, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function wp_cloud_sync_private.run_retention(boolean, timestamptz)
  from public, anon, authenticated, service_role;

commit;
