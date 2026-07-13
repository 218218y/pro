-- One-time migration from the former open per-store tables.
--
-- Run docs/supabase_cloud_sync.sql first, deploy the Edge Function and signed-room
-- client, then run this migration in the same maintenance window. The legacy
-- tables are retained as locked rollback backups; remove them only after the new
-- gateway has been verified in production and the backup retention window ends.

do $$
begin
  if to_regclass('public.wp_shared_state') is not null then
    execute $sql$
      insert into public.wp_cloud_sync_rooms
        (tenant_id, store_id, room, payload, revision, updated_at, updated_by)
      select 'bargig', 'bargig', room, payload, 1, updated_at, 'legacy-migration'
      from public.wp_shared_state
      on conflict (tenant_id, store_id, room) do nothing
    $sql$;
  end if;

  if to_regclass('public.wp_shared_state_store_1') is not null then
    execute $sql$
      insert into public.wp_cloud_sync_rooms
        (tenant_id, store_id, room, payload, revision, updated_at, updated_by)
      select 'store-1', 'store-1', room, payload, 1, updated_at, 'legacy-migration'
      from public.wp_shared_state_store_1
      on conflict (tenant_id, store_id, room) do nothing
    $sql$;
  end if;

  if to_regclass('public.wp_shared_state_store_2') is not null then
    execute $sql$
      insert into public.wp_cloud_sync_rooms
        (tenant_id, store_id, room, payload, revision, updated_at, updated_by)
      select 'store-2', 'store-2', room, payload, 1, updated_at, 'legacy-migration'
      from public.wp_shared_state_store_2
      on conflict (tenant_id, store_id, room) do nothing
    $sql$;
  end if;
end;
$$;
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'wp_shared_state',
    'wp_shared_state_store_1',
    'wp_shared_state_store_2'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('alter table public.%I force row level security', table_name);
      execute format('revoke all on table public.%I from anon, authenticated, public', table_name);
    end if;
  end loop;
end;
$$;
