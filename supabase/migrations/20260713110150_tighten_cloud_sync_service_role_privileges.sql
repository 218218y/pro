-- Final lock for the former browser-accessible Cloud Sync tables.
--
-- Do not run this file until both production origins serve the signed-room
-- client, the Edge Function read/write/CAS probes pass, and
-- docs/supabase_cloud_sync_multi_store.sql has just been rerun successfully.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  mapping record;
  has_missing boolean;
begin
  if to_regclass('public.wp_cloud_sync_rooms') is null then
    raise exception 'wp_cloud_sync_rooms must exist before legacy lockdown';
  end if;

  for mapping in
    select *
    from (
      values
        ('wp_shared_state'::text, 'bargig'::text, 'bargig'::text),
        ('wp_shared_state_store_1', 'store-1', 'store-1'),
        ('wp_shared_state_store_2', 'store-2', 'store-2')
    ) as entries(table_name, tenant_id, store_id)
  loop
    if to_regclass(format('public.%I', mapping.table_name)) is null then
      continue;
    end if;

    execute format(
      'select exists (
         select 1
         from public.%1$I legacy
         where not exists (
           select 1
           from public.wp_cloud_sync_rooms canonical
           where canonical.tenant_id = %2$L
             and canonical.store_id = %3$L
             and canonical.room = legacy.room
         )
       )',
      mapping.table_name,
      mapping.tenant_id,
      mapping.store_id
    ) into has_missing;

    if has_missing then
      raise exception '% contains rooms missing from wp_cloud_sync_rooms', mapping.table_name;
    end if;

    execute format('alter table public.%I enable row level security', mapping.table_name);
    execute format('alter table public.%I force row level security', mapping.table_name);
    execute format(
      'revoke all on table public.%I from anon, authenticated, public',
      mapping.table_name
    );
    execute format('revoke all on table public.%I from service_role', mapping.table_name);
    execute format('grant select on table public.%I to service_role', mapping.table_name);
  end loop;

  if to_regprocedure('public.wp_set_updated_at()') is not null then
    execute format('alter function public.wp_set_updated_at() set search_path = %L', '');
    execute 'revoke all on function public.wp_set_updated_at() from anon, authenticated, public';
  end if;
end;
$$;

commit;
