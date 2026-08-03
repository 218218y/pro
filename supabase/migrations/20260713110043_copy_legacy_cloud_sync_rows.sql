-- Re-runnable data copy from the former open per-store tables.
--
-- Run docs/supabase_cloud_sync.sql first. This script deliberately does not
-- revoke legacy browser access: the production client must be upgraded and the
-- signed-room gateway verified before docs/supabase_cloud_sync_legacy_lockdown.sql
-- is allowed to lock the old tables.

do $$
begin
  if to_regclass('public.wp_shared_state') is not null then
    execute $sql$
      insert into public.wp_cloud_sync_rooms as target
        (tenant_id, store_id, room, payload, revision, updated_at, updated_by)
      select 'bargig', 'bargig', room, payload, 1, updated_at, 'legacy-migration'
      from public.wp_shared_state
      on conflict (tenant_id, store_id, room) do update
      set
        payload = excluded.payload,
        revision = target.revision + 1,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
      where target.updated_at < excluded.updated_at
    $sql$;
  end if;

  if to_regclass('public.wp_shared_state_store_1') is not null then
    execute $sql$
      insert into public.wp_cloud_sync_rooms as target
        (tenant_id, store_id, room, payload, revision, updated_at, updated_by)
      select 'store-1', 'store-1', room, payload, 1, updated_at, 'legacy-migration'
      from public.wp_shared_state_store_1
      on conflict (tenant_id, store_id, room) do update
      set
        payload = excluded.payload,
        revision = target.revision + 1,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
      where target.updated_at < excluded.updated_at
    $sql$;
  end if;

  if to_regclass('public.wp_shared_state_store_2') is not null then
    execute $sql$
      insert into public.wp_cloud_sync_rooms as target
        (tenant_id, store_id, room, payload, revision, updated_at, updated_by)
      select 'store-2', 'store-2', room, payload, 1, updated_at, 'legacy-migration'
      from public.wp_shared_state_store_2
      on conflict (tenant_id, store_id, room) do update
      set
        payload = excluded.payload,
        revision = target.revision + 1,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
      where target.updated_at < excluded.updated_at
    $sql$;
  end if;
end;
$$;

-- Fail if a legacy room was not represented in the canonical table. Payloads
-- are not compared because a newer signed-room client may already have advanced
-- the canonical revision after the copy began.
do $$
begin
  if to_regclass('public.wp_shared_state') is not null and exists (
    select 1
    from public.wp_shared_state legacy
    where not exists (
      select 1
      from public.wp_cloud_sync_rooms canonical
      where canonical.tenant_id = 'bargig'
        and canonical.store_id = 'bargig'
        and canonical.room = legacy.room
    )
  ) then
    raise exception 'wp_shared_state contains rooms missing from wp_cloud_sync_rooms';
  end if;

  if to_regclass('public.wp_shared_state_store_1') is not null and exists (
    select 1
    from public.wp_shared_state_store_1 legacy
    where not exists (
      select 1
      from public.wp_cloud_sync_rooms canonical
      where canonical.tenant_id = 'store-1'
        and canonical.store_id = 'store-1'
        and canonical.room = legacy.room
    )
  ) then
    raise exception 'wp_shared_state_store_1 contains rooms missing from wp_cloud_sync_rooms';
  end if;

  if to_regclass('public.wp_shared_state_store_2') is not null and exists (
    select 1
    from public.wp_shared_state_store_2 legacy
    where not exists (
      select 1
      from public.wp_cloud_sync_rooms canonical
      where canonical.tenant_id = 'store-2'
        and canonical.store_id = 'store-2'
        and canonical.room = legacy.room
    )
  ) then
    raise exception 'wp_shared_state_store_2 contains rooms missing from wp_cloud_sync_rooms';
  end if;
end;
$$;
